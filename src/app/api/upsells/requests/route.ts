import { NextRequest, NextResponse } from 'next/server';
import { getReservationUpsells } from '@/lib/upsell-requests';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const reservationId = searchParams.get('reservationId');

  if (!reservationId) {
    return NextResponse.json({ error: 'reservationId is required' }, { status: 400 });
  }

  try {
    const upsells = await getReservationUpsells(reservationId);
    return NextResponse.json({ upsells });
  } catch (error) {
    console.error('Error fetching upsell requests:', error);
    return NextResponse.json(
      { error: 'Failed to fetch upsell requests' },
      { status: 500 }
    );
  }
}
