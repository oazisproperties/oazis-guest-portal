import { Redis } from '@upstash/redis';

// Initialize Redis client
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

// Key patterns
const CODE_TO_RESERVATION_KEY = (code: string) => `portal_code:${code.toUpperCase()}`;
const RESERVATION_TO_CODE_KEY = (reservationId: string) => `reservation:${reservationId}:portal_code`;

// Generate a random 6-letter uppercase code
export function generatePortalCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// Check if a portal code already exists
export async function portalCodeExists(code: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;

  const existing = await redis.get(CODE_TO_RESERVATION_KEY(code));
  return existing !== null;
}

// Generate a unique portal code
export async function generateUniquePortalCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const code = generatePortalCode();
    const exists = await portalCodeExists(code);
    if (!exists) {
      return code;
    }
    attempts++;
  }

  // Fallback: add timestamp suffix
  return generatePortalCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

// Store a portal code for a reservation
export async function storePortalCode(
  reservationId: string,
  portalCode: string
): Promise<{ success: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return { success: false, error: 'Redis not configured' };
  }

  try {
    const code = portalCode.toUpperCase();

    // Store both mappings (no expiry - codes are permanent)
    await redis.set(CODE_TO_RESERVATION_KEY(code), reservationId);
    await redis.set(RESERVATION_TO_CODE_KEY(reservationId), code);

    console.log(`Stored portal code ${code} for reservation ${reservationId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error storing portal code:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Get reservation ID by portal code
export async function getReservationIdByPortalCode(code: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const reservationId = await redis.get<string>(CODE_TO_RESERVATION_KEY(code));
    return reservationId;
  } catch (error) {
    console.error('Error looking up portal code:', error);
    return null;
  }
}

// Get portal code by reservation ID
export async function getPortalCodeByReservationId(reservationId: string): Promise<string | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const code = await redis.get<string>(RESERVATION_TO_CODE_KEY(reservationId));
    return code;
  } catch (error) {
    console.error('Error looking up reservation portal code:', error);
    return null;
  }
}

// Check if a reservation already has a portal code
export async function reservationHasPortalCode(reservationId: string): Promise<boolean> {
  const code = await getPortalCodeByReservationId(reservationId);
  return code !== null;
}
