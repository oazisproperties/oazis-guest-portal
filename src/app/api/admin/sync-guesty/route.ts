import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniquePortalCode,
  storePortalCode,
  getPortalCodeByReservationId,
} from '@/lib/portal-codes';
import { syncPortalCodeToGuesty } from '@/lib/guesty';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';
const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Delay between Guesty API calls to avoid rate limiting (recommended 5-25 seconds)
const SYNC_DELAY_MS = 5000;

interface GuestyReservation {
  _id: string;
  confirmationCode?: string;
  guestyConfirmationCode?: string;
  guest?: { fullName?: string };
  guestName?: string;
  checkInDateLocalized?: string;
  checkIn?: string;
  checkOutDateLocalized?: string;
  checkOut?: string;
  listing?: { nickname?: string; title?: string };
  listingTitle?: string;
  status?: string;
}

interface SyncResult {
  reservationId: string;
  confirmationCode: string;
  guestName: string;
  checkIn: string;
  property: string;
  portalCode: string;
  isNewCode: boolean;
  guestySynced: boolean;
  error?: string;
}

async function getToken() {
  if (process.env.GUESTY_ACCESS_TOKEN) {
    return process.env.GUESTY_ACCESS_TOKEN;
  }

  const response = await fetch('https://open-api.guesty.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'open-api',
      client_id: process.env.GUESTY_CLIENT_ID!,
      client_secret: process.env.GUESTY_CLIENT_SECRET!,
    }),
  });

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

async function getFutureReservations(): Promise<GuestyReservation[]> {
  const token = await getToken();
  const today = new Date().toISOString().split('T')[0];

  // Get confirmed reservations with check-in date >= today
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

  const data = (await response.json()) as { results?: GuestyReservation[] };
  return data.results || [];
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  // Check admin secret
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (ADMIN_SECRET && providedSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reservations = await getFutureReservations();
    const results: SyncResult[] = [];

    let synced = 0;
    let failed = 0;
    let skipped = 0;

    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      const reservationId = res._id;

      // Skip reservations without confirmation codes
      const confirmationCode = res.confirmationCode || res.guestyConfirmationCode || '';
      if (!confirmationCode.trim()) {
        skipped++;
        continue;
      }

      // Get or generate portal code
      let portalCode = await getPortalCodeByReservationId(reservationId);
      let isNewCode = false;

      if (!portalCode) {
        portalCode = await generateUniquePortalCode();
        await storePortalCode(reservationId, portalCode);
        isNewCode = true;
      }

      // Sync to Guesty
      const guestyResult = await syncPortalCodeToGuesty(reservationId, portalCode);

      const result: SyncResult = {
        reservationId,
        confirmationCode,
        guestName: res.guest?.fullName || res.guestName || 'Guest',
        checkIn: res.checkInDateLocalized || res.checkIn || '',
        property: res.listing?.nickname || res.listing?.title || res.listingTitle || '',
        portalCode,
        isNewCode,
        guestySynced: guestyResult.success,
        error: guestyResult.error,
      };

      results.push(result);

      if (guestyResult.success) {
        synced++;
      } else {
        failed++;
      }

      // Add delay between Guesty API calls to avoid rate limiting
      if (i < reservations.length - 1) {
        await delay(SYNC_DELAY_MS);
      }
    }

    // Sort by check-in date
    results.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    return NextResponse.json({
      message: `Synced ${synced} portal codes to Guesty (${failed} failed, ${skipped} skipped)`,
      total: reservations.length,
      synced,
      failed,
      skipped,
      newCodes: results.filter((r) => r.isNewCode).length,
      results,
    });
  } catch (error) {
    console.error('Error syncing to Guesty:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync portal codes to Guesty',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check sync status without making changes
export async function GET(request: NextRequest) {
  // Check admin secret
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (ADMIN_SECRET && providedSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reservations = await getFutureReservations();
    const status: Array<{
      reservationId: string;
      confirmationCode: string;
      guestName: string;
      checkIn: string;
      property: string;
      hasPortalCode: boolean;
      portalCode: string | null;
    }> = [];

    for (const res of reservations) {
      const reservationId = res._id;
      const confirmationCode = res.confirmationCode || res.guestyConfirmationCode || '';

      if (!confirmationCode.trim()) continue;

      const portalCode = await getPortalCodeByReservationId(reservationId);

      status.push({
        reservationId,
        confirmationCode,
        guestName: res.guest?.fullName || res.guestName || 'Guest',
        checkIn: res.checkInDateLocalized || res.checkIn || '',
        property: res.listing?.nickname || res.listing?.title || res.listingTitle || '',
        hasPortalCode: portalCode !== null,
        portalCode,
      });
    }

    status.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    const withCodes = status.filter((s) => s.hasPortalCode).length;
    const withoutCodes = status.filter((s) => !s.hasPortalCode).length;

    return NextResponse.json({
      message: `Found ${status.length} future reservations (${withCodes} with codes, ${withoutCodes} without)`,
      total: status.length,
      withCodes,
      withoutCodes,
      reservations: status,
    });
  } catch (error) {
    console.error('Error checking sync status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check sync status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
