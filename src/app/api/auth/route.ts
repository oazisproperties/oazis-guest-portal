import { NextRequest, NextResponse } from 'next/server';
import { getReservationByConfirmationCode } from '@/lib/guesty';
import { isDemoCode, demoReservation } from '@/lib/demo-data';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { confirmationCode } = body;

    if (!confirmationCode) {
      return NextResponse.json(
        { error: 'Confirmation code is required' },
        { status: 400 }
      );
    }

    // Check for demo mode
    if (isDemoCode(confirmationCode)) {
      const session = {
        reservationId: demoReservation.id,
        confirmationCode: demoReservation.confirmationCode,
        guestName: demoReservation.guestName,
        listingId: demoReservation.listingId,
        isDemo: true,
      };
      return NextResponse.json({ session, reservation: demoReservation });
    }

    const reservation = await getReservationByConfirmationCode(confirmationCode);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found. Please check your confirmation code.' },
        { status: 404 }
      );
    }

    // Create session data
    const session = {
      reservationId: reservation.id,
      confirmationCode: reservation.confirmationCode,
      guestName: reservation.guestName,
      listingId: reservation.listingId,
    };

    return NextResponse.json({ session, reservation });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
