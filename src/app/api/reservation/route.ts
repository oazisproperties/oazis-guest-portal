import { NextRequest, NextResponse } from 'next/server';
import { getReservationById, getProperty, getPayments } from '@/lib/guesty';
import { demoReservation, demoPayments } from '@/lib/demo-data';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const reservationId = searchParams.get('id');

    if (!reservationId) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    // Check for demo mode
    if (reservationId.startsWith('demo-')) {
      return NextResponse.json({
        reservation: demoReservation,
        payments: demoPayments,
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

    return NextResponse.json({
      reservation: {
        ...reservation,
        listing: property,
      },
      payments,
    });
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservation details' },
      { status: 500 }
    );
  }
}
