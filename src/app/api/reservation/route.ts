import { NextResponse } from 'next/server';
import { getReservationById, getProperty, getPayments } from '@/lib/guesty';
import { demoReservation, demoPayments } from '@/lib/demo-data';
import { getHouseManualUrl } from '@/lib/upsells';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    // Verify session - user can only access their own reservation
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const reservationId = session.reservationId;

    // Check for demo mode
    if (session.isDemo || reservationId.startsWith('demo-')) {
      const houseManualUrl = getHouseManualUrl(demoReservation.listingId);
      return NextResponse.json({
        reservation: demoReservation,
        payments: demoPayments,
        houseManualUrl,
      });
    }

    const reservation = await getReservationById(reservationId);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found' },
        { status: 404 }
      );
    }

    // Fetch property details
    const property = await getProperty(reservation.listingId);

    // Fetch payments
    const payments = await getPayments(reservationId);

    // Get house manual URL for this property
    const houseManualUrl = getHouseManualUrl(reservation.listingId);

    return NextResponse.json({
      reservation: {
        ...reservation,
        listing: property,
      },
      payments,
      houseManualUrl,
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation details' },
      { status: 500 }
    );
  }
}
