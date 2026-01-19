import { NextRequest, NextResponse } from 'next/server';
import {
  generateUniquePortalCode,
  storePortalCode,
  reservationHasPortalCode,
} from '@/lib/portal-codes';

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
    if (hasCode) {
      console.log(`Reservation ${reservationId} already has a portal code`);
      return NextResponse.json({
        message: 'Portal code already exists',
        reservationId,
      });
    }

    // Generate a unique portal code
    const portalCode = await generateUniquePortalCode();
    console.log(`Generated portal code ${portalCode} for reservation ${reservationId}`);

    // Store the portal code in Redis
    const result = await storePortalCode(reservationId, portalCode);

    if (result.success) {
      console.log(`Successfully stored portal_code ${portalCode} for reservation ${reservationId}`);
      return NextResponse.json({
        message: 'Portal code created',
        reservationId,
        portalCode,
      });
    } else {
      console.error(`Failed to store portal code for ${reservationId}:`, result.error);
      return NextResponse.json(
        { error: 'Failed to store portal code', details: result.error, reservationId },
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
