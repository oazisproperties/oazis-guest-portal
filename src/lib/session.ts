import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';

const SESSION_COOKIE_NAME = 'guest_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24; // 24 hours

export interface SessionData {
  reservationId: string;
  confirmationCode: string;
  guestName: string;
  listingId: string;
  isDemo?: boolean;
  createdAt: number;
}

function getRedis(): Redis | null {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (redisUrl && redisToken) {
    return new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }
  return null;
}

function getSessionKey(sessionId: string): string {
  return `session:${sessionId}`;
}

/**
 * Create a new session and set HTTP-only cookie
 */
export async function createSession(data: Omit<SessionData, 'createdAt'>): Promise<string | null> {
  const redis = getRedis();
  if (!redis) {
    console.error('Redis not configured - cannot create session');
    return null;
  }

  const sessionId = randomUUID();
  const sessionData: SessionData = {
    ...data,
    createdAt: Date.now(),
  };

  try {
    await redis.set(getSessionKey(sessionId), sessionData, { ex: SESSION_TTL_SECONDS });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_TTL_SECONDS,
      path: '/',
    });

    console.log(`Created session ${sessionId} for reservation ${data.reservationId}`);
    return sessionId;
  } catch (error) {
    console.error('Error creating session:', error);
    return null;
  }
}

/**
 * Get current session data from cookie
 */
export async function getSession(): Promise<SessionData | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return null;
    }

    const sessionData = await redis.get<SessionData>(getSessionKey(sessionId));

    if (!sessionData) {
      // Session expired or invalid - clear the cookie
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return sessionData;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Verify session and return session data (for API routes)
 */
export async function verifySession(sessionId: string): Promise<SessionData | null> {
  const redis = getRedis();
  if (!redis) {
    return null;
  }

  try {
    const sessionData = await redis.get<SessionData>(getSessionKey(sessionId));
    return sessionData;
  } catch (error) {
    console.error('Error verifying session:', error);
    return null;
  }
}

/**
 * Destroy session and clear cookie
 */
export async function destroySession(): Promise<boolean> {
  const redis = getRedis();

  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (sessionId && redis) {
      await redis.del(getSessionKey(sessionId));
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
    return true;
  } catch (error) {
    console.error('Error destroying session:', error);
    return false;
  }
}

/**
 * Refresh session TTL (extend expiration)
 */
export async function refreshSession(): Promise<boolean> {
  const redis = getRedis();
  if (!redis) {
    return false;
  }

  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionId) {
      return false;
    }

    // Extend Redis TTL
    const extended = await redis.expire(getSessionKey(sessionId), SESSION_TTL_SECONDS);

    if (extended) {
      // Refresh cookie expiration
      cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_TTL_SECONDS,
        path: '/',
      });
    }

    return extended === 1;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
}
