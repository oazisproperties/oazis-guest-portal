import { NextResponse } from 'next/server';
import { getReservationUpsells } from '@/lib/upsell-requests';
import { getSession } from '@/lib/session';

export async function GET() {
  // Verify session
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized. Please log in.' },
      { status: 401 }
    );
  }

  try {
    // Use reservation ID from session, not from query params
    const upsells = await getReservationUpsells(session.reservationId);
    return NextResponse.json({ upsells });
  } catch (error) {
    console.error('Error fetching upsell requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upsell requests' },
      { status: 500 }
    );
  }
}
