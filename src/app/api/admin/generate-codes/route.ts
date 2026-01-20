import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniquePortalCode,
  storePortalCode,
  getPortalCodeByReservationId
} from '@/lib/portal-codes';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';

// Simple admin secret check
const ADMIN_SECRET = process.env.ADMIN_SECRET;

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

  const data = await response.json();
  return data.access_token;
}

async function getFutureReservations() {
  const token = await getToken();
  const today = new Date().toISOString().split('T')[0];

  // Get reservations with check-in date >= today
  const filters = JSON.stringify([
    { operator: '$gte', field: 'checkInDateLocalized', value: today }
  ]);

  const response = await fetch(
    `${GUESTY_API_URL}/reservations?filters=${encodeURIComponent(filters)}&limit=100&fields=_id,confirmationCode,guestyConfirmationCode,guest.fullName,checkInDateLocalized,checkOutDateLocalized,listing.nickname,status`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    }
  );

  const data = await response.json();
  return data.results || [];
}

export async function GET(request: NextRequest) {
  // Check admin secret
  const authHeader = request.headers.get('authorization');
  const providedSecret = authHeader?.replace('Bearer ', '');

  if (ADMIN_SECRET && providedSecret !== ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const reservations = await getFutureReservations();
    const results: Array<{
      reservationId: string;
      confirmationCode: string;
      guestName: string;
      checkIn: string;
      checkOut: string;
      property: string;
      status: string;
      portalCode: string;
      isNew: boolean;
    }> = [];

    for (const res of reservations) {
      const reservationId = res._id;

      // Check if already has a portal code
      let portalCode = await getPortalCodeByReservationId(reservationId);
      let isNew = false;

      if (!portalCode) {
        // Generate and store new code
        portalCode = await generateUniquePortalCode();
        await storePortalCode(reservationId, portalCode);
        isNew = true;
      }

      results.push({
        reservationId,
        confirmationCode: res.confirmationCode || res.guestyConfirmationCode || '',
        guestName: res.guest?.fullName || 'Guest',
        checkIn: res.checkInDateLocalized || '',
        checkOut: res.checkOutDateLocalized || '',
        property: res.listing?.nickname || '',
        status: res.status || '',
        portalCode,
        isNew,
      });
    }

    // Sort by check-in date
    results.sort((a, b) => a.checkIn.localeCompare(b.checkIn));

    // Generate CSV format for easy pasting
    const csvHeader = 'Guest Name\tConfirmation Code\tPortal Code\tCheck-In\tCheck-Out\tProperty\tStatus';
    const csvRows = results.map(r =>
      `${r.guestName}\t${r.confirmationCode}\t${r.portalCode}\t${r.checkIn}\t${r.checkOut}\t${r.property}\t${r.status}`
    );
    const csv = [csvHeader, ...csvRows].join('\n');

    return NextResponse.json({
      message: `Generated portal codes for ${results.filter(r => r.isNew).length} new reservations (${results.length} total future reservations)`,
      count: results.length,
      newCodes: results.filter(r => r.isNew).length,
      results,
      csv,
    });
  } catch (error) {
    console.error('Error generating codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate codes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
