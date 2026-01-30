import { NextResponse } from 'next/server';
import { getSession, refreshSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    // Refresh session on activity (extends TTL)
    await refreshSession();

    return NextResponse.json({
      authenticated: true,
      session: {
        reservationId: session.reservationId,
        confirmationCode: session.confirmationCode,
        guestName: session.guestName,
        listingId: session.listingId,
        isDemo: session.isDemo,
      },
    });
  } catch (error) {
    console.error('Session check error:', error);
    return NextResponse.json(
      { authenticated: false, error: 'Session check failed' },
      { status: 500 }
    );
  }
}
