import { NextRequest, NextResponse } from 'next/server';
import { getReservationByConfirmationCode } from '@/lib/guesty';
import { isDemoCode, demoReservation } from '@/lib/demo-data';
import { createSession } from '@/lib/session';
import { rateLimiters, getClientIP } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 attempts per minute per IP
    const clientIP = getClientIP(request);
    const rateLimit = await rateLimiters.auth(clientIP);

    if (!rateLimit.success) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString(),
          },
        }
      );
    }

    const body = await request.json() as { confirmationCode?: string };
    const { confirmationCode } = body;

    if (!confirmationCode) {
      return NextResponse.json(
        { error: 'Confirmation code is required' },
        { status: 400 }
      );
    }

    // Validate confirmation code format (alphanumeric, reasonable length)
    const trimmedCode = confirmationCode.trim();
    if (trimmedCode.length < 4 || trimmedCode.length > 30 || !/^[A-Za-z0-9-]+$/.test(trimmedCode)) {
      return NextResponse.json(
        { error: 'Invalid confirmation code format.' },
        { status: 400 }
      );
    }

    // Check for demo mode
    if (isDemoCode(trimmedCode)) {
      const sessionData = {
        reservationId: demoReservation.id,
        confirmationCode: demoReservation.confirmationCode,
        guestName: demoReservation.guestName,
        listingId: demoReservation.listingId,
        isDemo: true,
      };

      // Create session with HTTP-only cookie
      const sessionId = await createSession(sessionData);
      if (!sessionId) {
        return NextResponse.json(
          { error: 'Failed to create session. Please try again.' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        reservation: demoReservation,
      });
    }

    const reservation = await getReservationByConfirmationCode(trimmedCode);

    if (!reservation) {
      return NextResponse.json(
        { error: 'Reservation not found. Please check your confirmation code.' },
        { status: 404 }
      );
    }

    // Create session with HTTP-only cookie
    const sessionData = {
      reservationId: reservation.id,
      confirmationCode: reservation.confirmationCode,
      guestName: reservation.guestName,
      listingId: reservation.listingId,
    };

    const sessionId = await createSession(sessionData);
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Failed to create session. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reservation,
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    );
  }
}
