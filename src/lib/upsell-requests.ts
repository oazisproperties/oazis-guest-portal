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

export interface UpsellRequest {
  id: string;
  reservationId: string;
  items: Array<{
    upsellId: string;
    optionId?: string;
    name: string;
    price: number;
    currency: string;
  }>;
  totalAmount: number;
  currency: string;
  paymentIntentId: string;
  customerEmail?: string;
  guestName?: string;
  propertyName?: string;
  checkInDate?: string;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  createdAt: string;
  approvedAt?: string;
}

// Key patterns
const UPSELL_REQUEST_KEY = (requestId: string) => `upsell_request:${requestId}`;
const RESERVATION_UPSELLS_KEY = (reservationId: string) => `reservation:${reservationId}:upsells`;
const PENDING_UPSELLS_KEY = 'pending_upsells'; // Sorted set by check-in date for reminders

// Store a new upsell request
export async function storeUpsellRequest(request: UpsellRequest): Promise<{ success: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return { success: false, error: 'Redis not configured' };
  }

  try {
    // Store the full request object
    await redis.set(UPSELL_REQUEST_KEY(request.id), JSON.stringify(request));

    // Add to reservation's upsell list
    await redis.sadd(RESERVATION_UPSELLS_KEY(request.reservationId), request.id);

    // Add to pending upsells sorted set (for reminders)
    // Score is the check-in date timestamp
    if (request.checkInDate) {
      const checkInTimestamp = new Date(request.checkInDate).getTime();
      await redis.zadd(PENDING_UPSELLS_KEY, {
        score: checkInTimestamp,
        member: request.id,
      });
    }

    console.log(`Stored upsell request ${request.id} for reservation ${request.reservationId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error storing upsell request:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Get an upsell request by ID
export async function getUpsellRequest(requestId: string): Promise<UpsellRequest | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const data = await redis.get<string>(UPSELL_REQUEST_KEY(requestId));
    if (!data) return null;
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (error) {
    console.error('Error getting upsell request:', error);
    return null;
  }
}

// Get all upsell requests for a reservation
export async function getReservationUpsells(reservationId: string): Promise<UpsellRequest[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const requestIds = await redis.smembers(RESERVATION_UPSELLS_KEY(reservationId));
    if (!requestIds || requestIds.length === 0) return [];

    const requests: UpsellRequest[] = [];
    for (const id of requestIds) {
      const request = await getUpsellRequest(id as string);
      if (request) {
        requests.push(request);
      }
    }

    // Sort by created date, newest first
    requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return requests;
  } catch (error) {
    console.error('Error getting reservation upsells:', error);
    return [];
  }
}

// Update upsell request status
export async function updateUpsellRequestStatus(
  requestId: string,
  status: 'pending' | 'approved' | 'declined' | 'expired',
  approvedAt?: string
): Promise<{ success: boolean; error?: string }> {
  const redis = getRedis();
  if (!redis) {
    return { success: false, error: 'Redis not configured' };
  }

  try {
    const request = await getUpsellRequest(requestId);
    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    request.status = status;
    if (approvedAt) {
      request.approvedAt = approvedAt;
    }

    await redis.set(UPSELL_REQUEST_KEY(requestId), JSON.stringify(request));

    // If approved or declined, remove from pending set
    if (status === 'approved' || status === 'declined' || status === 'expired') {
      await redis.zrem(PENDING_UPSELLS_KEY, requestId);
    }

    console.log(`Updated upsell request ${requestId} status to ${status}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating upsell request status:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Get pending upsells for reminder (check-ins within a date range)
export async function getPendingUpsellsForReminder(
  startDate: Date,
  endDate: Date
): Promise<UpsellRequest[]> {
  const redis = getRedis();
  if (!redis) return [];

  try {
    const startTimestamp = startDate.getTime();
    const endTimestamp = endDate.getTime();

    // Get upsell IDs with check-in dates in the range
    const requestIds = await redis.zrangebyscore(PENDING_UPSELLS_KEY, startTimestamp, endTimestamp);
    if (!requestIds || requestIds.length === 0) return [];

    const requests: UpsellRequest[] = [];
    for (const id of requestIds) {
      const request = await getUpsellRequest(id as string);
      // Only include approved requests for reminders
      if (request && request.status === 'approved') {
        requests.push(request);
      }
    }

    return requests;
  } catch (error) {
    console.error('Error getting pending upsells for reminder:', error);
    return [];
  }
}

// Find upsell request by payment intent ID
export async function findUpsellRequestByPaymentIntent(paymentIntentId: string): Promise<UpsellRequest | null> {
  const redis = getRedis();
  if (!redis) return null;

  try {
    // This is a bit inefficient but works for our scale
    // In production, you might want a separate index
    const keys = await redis.keys('upsell_request:*');

    for (const key of keys) {
      const data = await redis.get<string>(key as string);
      if (data) {
        const request: UpsellRequest = typeof data === 'string' ? JSON.parse(data) : data;
        if (request.paymentIntentId === paymentIntentId) {
          return request;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding upsell request by payment intent:', error);
    return null;
  }
}
