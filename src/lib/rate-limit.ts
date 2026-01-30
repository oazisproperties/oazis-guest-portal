import { Redis } from '@upstash/redis';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp when the window resets
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

function getRateLimitKey(identifier: string, prefix: string): string {
  return `ratelimit:${prefix}:${identifier}`;
}

/**
 * Check and update rate limit for an identifier (e.g., IP address)
 * Uses a sliding window counter approach
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  prefix: string = 'default'
): Promise<RateLimitResult> {
  const redis = getRedis();

  // If Redis is not available, allow the request (fail open for dev)
  if (!redis) {
    console.warn('Redis not configured - rate limiting disabled');
    return {
      success: true,
      remaining: config.maxRequests,
      resetAt: Date.now() + config.windowMs,
    };
  }

  const key = getRateLimitKey(identifier, prefix);
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Use a sorted set to track request timestamps
    // Remove old entries outside the window
    await redis.zremrangebyscore(key, 0, windowStart);

    // Count current requests in the window
    const currentCount = await redis.zcard(key);

    if (currentCount >= config.maxRequests) {
      // Get the oldest request timestamp to calculate reset time
      const oldest = await redis.zrange<number[]>(key, 0, 0);
      const resetAt = oldest.length > 0 ? oldest[0] + config.windowMs : now + config.windowMs;

      return {
        success: false,
        remaining: 0,
        resetAt,
      };
    }

    // Add the current request
    await redis.zadd(key, { score: now, member: now });

    // Set expiry on the key to auto-cleanup
    await redis.expire(key, Math.ceil(config.windowMs / 1000) + 1);

    return {
      success: true,
      remaining: config.maxRequests - currentCount - 1,
      resetAt: now + config.windowMs,
    };
  } catch (error) {
    console.error('Rate limit error:', error);
    // Fail open on errors
    return {
      success: true,
      remaining: config.maxRequests,
      resetAt: now + config.windowMs,
    };
  }
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Auth endpoint: 5 attempts per minute
  auth: (identifier: string) =>
    checkRateLimit(identifier, { windowMs: 60 * 1000, maxRequests: 5 }, 'auth'),

  // General API: 60 requests per minute
  api: (identifier: string) =>
    checkRateLimit(identifier, { windowMs: 60 * 1000, maxRequests: 60 }, 'api'),

  // Strict: 3 attempts per 5 minutes (for sensitive operations)
  strict: (identifier: string) =>
    checkRateLimit(identifier, { windowMs: 5 * 60 * 1000, maxRequests: 3 }, 'strict'),
};

/**
 * Extract client IP from request headers
 * Handles Vercel/Cloudflare proxy headers
 */
export function getClientIP(request: Request): string {
  // Vercel
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  // Cloudflare
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  // Real IP header
  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}
