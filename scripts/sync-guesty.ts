/**
 * Standalone script to sync portal codes from Upstash to Guesty
 * Run with: npx tsx scripts/sync-guesty.ts
 */

import { Redis } from '@upstash/redis';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';
const SYNC_DELAY_MS = 5000;
const PORTAL_CODE_FIELD_ID = '696db156c6cd55001401cdf1'; // MongoDB ObjectId for portal_code custom field

// Initialize Redis
const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

interface GuestyReservation {
  _id: string;
  confirmationCode?: string;
  guestyConfirmationCode?: string;
  guest?: { fullName?: string };
  checkInDateLocalized?: string;
  checkIn?: string;
  listing?: { nickname?: string; title?: string };
  status?: string;
}

interface CustomField {
  _id: string;
  fieldId: string;
  title: string;
}

async function getToken(): Promise<string> {
  if (process.env.GUESTY_ACCESS_TOKEN) {
    return process.env.GUESTY_ACCESS_TOKEN;
  }

  const response = await fetch('https://open-api.guesty.com/oauth2/token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'open-api',
      client_id: process.env.GUESTY_CLIENT_ID!,
      client_secret: process.env.GUESTY_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get token: ${response.status}`);
  }

  const data = (await response.json()) as { access_token: string };
  console.log('✓ Got Guesty access token');
  return data.access_token;
}

async function getCustomFieldId(_token: string): Promise<string> {
  // Use the known portal_code custom field ID
  console.log(`✓ Using portal_code custom field (ID: ${PORTAL_CODE_FIELD_ID})`);
  return PORTAL_CODE_FIELD_ID;
}

async function getFutureReservations(token: string): Promise<GuestyReservation[]> {
  const today = new Date().toISOString().split('T')[0];
  const filters = JSON.stringify([
    { operator: '$gte', field: 'checkInDateLocalized', value: today },
    { operator: '$eq', field: 'status', value: 'confirmed' },
  ]);

  const response = await fetch(
    `${GUESTY_API_URL}/reservations?filters=${encodeURIComponent(filters)}&limit=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get reservations: ${response.status}`);
  }

  const data = (await response.json()) as { results?: GuestyReservation[] };
  return data.results || [];
}

function generatePortalCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

async function getOrCreatePortalCode(reservationId: string): Promise<{ code: string; isNew: boolean }> {
  const existingCode = await redis.get<string>(`reservation:${reservationId}:portal_code`);

  if (existingCode) {
    return { code: existingCode, isNew: false };
  }

  // Generate new code
  let code = generatePortalCode();
  let attempts = 0;

  while (attempts < 10) {
    const exists = await redis.get(`portal_code:${code}`);
    if (!exists) break;
    code = generatePortalCode();
    attempts++;
  }

  // Store in Redis
  await redis.set(`portal_code:${code}`, reservationId);
  await redis.set(`reservation:${reservationId}:portal_code`, code);

  return { code, isNew: true };
}

async function syncToGuesty(
  token: string,
  customFieldId: string,
  reservationId: string,
  portalCode: string
): Promise<{ success: boolean; error?: string }> {
  const response = await fetch(
    `${GUESTY_API_URL}/reservations/${reservationId}/custom-fields`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customFields: [
          {
            fieldId: customFieldId,
            value: portalCode,
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `${response.status}: ${errorText}` };
  }

  return { success: true };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log('\n🚀 Starting Guesty Portal Code Sync\n');

  // Get token
  const token = await getToken();

  // Get custom field ID
  const customFieldId = await getCustomFieldId(token);
  if (!customFieldId) {
    console.error('\n❌ Cannot proceed without portal_code custom field');
    process.exit(1);
  }

  // Get future reservations
  const reservations = await getFutureReservations(token);
  console.log(`\n📋 Found ${reservations.length} future confirmed reservations\n`);

  if (reservations.length === 0) {
    console.log('No reservations to sync.');
    return;
  }

  let synced = 0;
  let failed = 0;
  let newCodes = 0;

  for (let i = 0; i < reservations.length; i++) {
    const res = reservations[i];
    const confirmationCode = res.confirmationCode || res.guestyConfirmationCode || '';

    if (!confirmationCode.trim()) {
      console.log(`⏭️  Skipping reservation ${res._id} (no confirmation code)`);
      continue;
    }

    // Get or create portal code
    const { code, isNew } = await getOrCreatePortalCode(res._id);
    if (isNew) newCodes++;

    // Sync to Guesty
    const result = await syncToGuesty(token, customFieldId, res._id, code);

    const guestName = res.guest?.fullName || 'Guest';
    const checkIn = (res.checkInDateLocalized || res.checkIn || '').split('T')[0];
    const property = res.listing?.nickname || res.listing?.title || '';

    if (result.success) {
      synced++;
      console.log(
        `✓ [${i + 1}/${reservations.length}] ${guestName} | ${confirmationCode} → ${code} | ${checkIn} | ${property}${isNew ? ' (NEW)' : ''}`
      );
    } else {
      failed++;
      console.log(
        `✗ [${i + 1}/${reservations.length}] ${guestName} | ${confirmationCode} → ${code} | ${result.error}`
      );
      // Only show detailed error for first few failures
      if (failed <= 3) {
        console.log(`   Error details: ${result.error}`);
      }
    }

    // Delay between requests
    if (i < reservations.length - 1) {
      await delay(SYNC_DELAY_MS);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Sync complete: ${synced} synced, ${failed} failed, ${newCodes} new codes`);
  console.log('='.repeat(60) + '\n');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
