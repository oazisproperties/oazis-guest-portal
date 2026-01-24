import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniquePortalCode,
  storePortalCode,
  reservationHasPortalCode,
  getPortalCodeByReservationId,
} from '@/lib/portal-codes';
import { syncPortalCodeToGuesty } from '@/lib/guesty';

// Webhook secret for verification (set this in your environment variables)
const WEBHOOK_SECRET = process.env.GUESTY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (WEBHOOK_SECRET) {
      const authHeader = request.headers.get('x-webhook-secret');
      if (authHeader !== WEBHOOK_SECRET) {
        console.error('Webhook secret mismatch');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const payload = await request.json();
    console.log('Guesty webhook received:', JSON.stringify(payload, null, 2));

    // Guesty webhooks send event type and data
    const eventType = payload.event || payload.type;
    const reservation = payload.reservation || payload.data?.reservation || payload;

    // Only process new reservations
    if (eventType && !eventType.includes('reservation') && !eventType.includes('created')) {
      console.log('Ignoring non-reservation event:', eventType);
      return NextResponse.json({ message: 'Event ignored' });
    }

    // Get reservation ID
    const reservationId = reservation._id || reservation.id || reservation.reservationId;

    if (!reservationId) {
      console.error('No reservation ID found in webhook payload');
      return NextResponse.json({ error: 'No reservation ID' }, { status: 400 });
    }

    // Check if portal code already exists in Redis
    const hasCode = await reservationHasPortalCode(reservationId);
    let portalCode: string;

    if (hasCode) {
      // Get existing code and ensure it's synced to Guesty
      portalCode = (await getPortalCodeByReservationId(reservationId)) || '';
      console.log(`Reservation ${reservationId} already has portal code ${portalCode}, ensuring Guesty sync`);
    } else {
      // Generate a unique portal code
      portalCode = await generateUniquePortalCode();
      console.log(`Generated portal code ${portalCode} for reservation ${reservationId}`);

      // Store the portal code in Redis
      const result = await storePortalCode(reservationId, portalCode);

      if (!result.success) {
        console.error(`Failed to store portal code for ${reservationId}:`, result.error);
        return NextResponse.json(
          { error: 'Failed to store portal code', details: result.error, reservationId },
          { status: 500 }
        );
      }
      console.log(`Successfully stored portal_code ${portalCode} in Redis for reservation ${reservationId}`);
    }

    // Sync portal code to Guesty custom fields
    const guestyResult = await syncPortalCodeToGuesty(reservationId, portalCode);

    if (guestyResult.success) {
      console.log(`Successfully synced portal_code ${portalCode} to Guesty for reservation ${reservationId}`);
      return NextResponse.json({
        message: hasCode ? 'Portal code synced to Guesty' : 'Portal code created and synced',
        reservationId,
        portalCode,
        guestySynced: true,
      });
    } else {
      // Code is stored in Redis but Guesty sync failed - still return success but note the issue
      console.warn(`Portal code stored in Redis but Guesty sync failed: ${guestyResult.error}`);
      return NextResponse.json({
        message: hasCode ? 'Portal code exists (Guesty sync failed)' : 'Portal code created (Guesty sync failed)',
        reservationId,
        portalCode,
        guestySynced: false,
        guestyError: guestyResult.error,
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Guesty may send a GET request to verify the endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok', message: 'Guesty webhook endpoint' });
}
