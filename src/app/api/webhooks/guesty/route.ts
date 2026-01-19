import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniquePortalCode,
  updateReservationPortalCode,
} from '@/lib/guesty';

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

    // Check if portal_code already exists
    const existingPortalCode = reservation.customFields?.portal_code;
    if (existingPortalCode) {
      console.log(`Reservation ${reservationId} already has portal_code: ${existingPortalCode}`);
      return NextResponse.json({
        message: 'Portal code already exists',
        portalCode: existingPortalCode,
      });
    }

    // Generate a unique portal code
    const portalCode = await generateUniquePortalCode();
    console.log(`Generated portal code ${portalCode} for reservation ${reservationId}`);

    // Update the reservation with the portal code
    const result = await updateReservationPortalCode(reservationId, portalCode);

    if (result.success) {
      console.log(`Successfully set portal_code ${portalCode} for reservation ${reservationId}`);
      return NextResponse.json({
        message: 'Portal code created',
        reservationId,
        portalCode,
      });
    } else {
      console.error(`Failed to update reservation ${reservationId}:`, result.error);
      return NextResponse.json(
        { error: 'Failed to update reservation', details: result.error, reservationId },
        { status: 500 }
      );
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
