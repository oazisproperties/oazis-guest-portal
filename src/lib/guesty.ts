import { Reservation, Property, Payment } from '@/types';
import { Redis } from '@upstash/redis';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';
const TOKEN_CACHE_KEY = 'guesty_access_token';

// In-memory fallback for local development
let localCachedToken: string | null = null;
let localTokenExpiry: number = 0;

interface CachedToken {
  token: string;
  expiry: number;
}

// Initialize Redis client only if credentials are available
function getRedis(): Redis | null {
  // Support both Upstash and Vercel KV naming conventions
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

async function getAccessToken(): Promise<string> {
  // Check for manually provided token first (useful when rate limited)
  if (process.env.GUESTY_ACCESS_TOKEN) {
    console.log('Using manually provided Guesty access token');
    return process.env.GUESTY_ACCESS_TOKEN;
  }

  const redis = getRedis();

  // Try to get token from Redis (production) or local cache (development)
  try {
    if (redis) {
      // Production: Use Upstash Redis
      const cached = await redis.get<CachedToken>(TOKEN_CACHE_KEY);
      if (cached && Date.now() < cached.expiry - 300000) {
        console.log('Using cached Guesty access token from Redis');
        return cached.token;
      }
    } else {
      // Development: Use in-memory cache
      if (localCachedToken && Date.now() < localTokenExpiry - 300000) {
        console.log('Using cached Guesty access token (local)');
        return localCachedToken;
      }
    }
  } catch (err) {
    console.error('Error reading token cache:', err);
  }

  console.log('Requesting new Guesty access token...');

  const response = await fetch('https://open-api.guesty.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      scope: 'open-api',
      client_id: process.env.GUESTY_CLIENT_ID!,
      client_secret: process.env.GUESTY_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Guesty token error:', response.status, errorText);

    if (response.status === 429) {
      throw new Error('Guesty OAuth rate limit exceeded. Only 5 tokens allowed per 24 hours. Set GUESTY_ACCESS_TOKEN manually or wait for reset.');
    }
    throw new Error(`Failed to get Guesty access token: ${response.status}`);
  }

  const data = await response.json();
  const expiry = Date.now() + (data.expires_in * 1000);

  // Cache the token
  try {
    if (redis) {
      // Production: Store in Upstash Redis (expires in 23 hours to be safe)
      await redis.set(TOKEN_CACHE_KEY, { token: data.access_token, expiry }, { ex: 82800 });
      console.log('Stored Guesty access token in Redis, valid for', data.expires_in, 'seconds');
    } else {
      // Development: Store in memory
      localCachedToken = data.access_token;
      localTokenExpiry = expiry;
      console.log('Stored Guesty access token locally, valid for', data.expires_in, 'seconds');
    }
  } catch (err) {
    console.error('Error caching token:', err);
  }

  return data.access_token;
}

async function guestyFetch(endpoint: string, params?: Record<string, string>) {
  const token = await getAccessToken();

  let url = `${GUESTY_API_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams(params);
    url += `?${searchParams.toString()}`;
  }

  console.log('Guesty API request:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Guesty API error:', response.status, errorText);
    throw new Error(`Guesty API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export async function getReservationByConfirmationCode(
  confirmationCode: string
): Promise<Reservation | null> {
  try {
    // Use $in operator with array as per Guesty API docs
    const filters = JSON.stringify([
      { operator: '$in', field: 'confirmationCode', value: [confirmationCode] }
    ]);

    const data = await guestyFetch('/reservations', { filters });

    console.log('Guesty reservation search results:', data.results?.length || 0, 'found');

    if (data.results && data.results.length > 0) {
      const res = data.results[0];
      return {
        id: res._id,
        confirmationCode: res.confirmationCode,
        guestName: res.guest?.fullName || 'Guest',
        guestEmail: res.guest?.email || '',
        checkIn: res.checkIn,
        checkOut: res.checkOut,
        checkInTime: res.listing?.defaultCheckInTime || '15:00',
        checkOutTime: res.listing?.defaultCheckOutTime || '11:00',
        status: res.status,
        listingId: res.listingId,
        money: {
          totalPaid: res.money?.totalPaid || 0,
          balanceDue: res.money?.balanceDue || 0,
          currency: res.money?.currency || 'USD',
        },
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return null;
  }
}

export async function getReservationById(id: string): Promise<Reservation | null> {
  try {
    const res = await guestyFetch(`/reservations/${id}`);

    // Use plannedArrival/plannedDeparture if set, otherwise fall back to listing defaults
    const checkInTime = res.plannedArrival || res.listing?.defaultCheckInTime || '15:00';
    const checkOutTime = res.plannedDeparture || res.listing?.defaultCheckOutTime || '11:00';

    return {
      id: res._id,
      confirmationCode: res.confirmationCode,
      guestName: res.guest?.fullName || 'Guest',
      guestEmail: res.guest?.email || '',
      checkIn: res.checkInDateLocalized || res.checkIn,
      checkOut: res.checkOutDateLocalized || res.checkOut,
      checkInTime,
      checkOutTime,
      status: res.status,
      listingId: res.listingId,
      money: {
        totalPaid: res.money?.totalPaid || 0,
        balanceDue: res.money?.balanceDue || 0,
        currency: res.money?.currency || 'USD',
      },
    };
  } catch (error) {
    console.error('Error fetching reservation:', error);
    return null;
  }
}

export async function getProperty(listingId: string): Promise<Property | null> {
  try {
    const listing = await guestyFetch(`/listings/${listingId}`);

    // Get custom fields for WiFi info
    const wifiName = listing.customFields?.find(
      (f: { fieldId: string; value: string }) =>
        f.fieldId.toLowerCase().includes('wifi') && f.fieldId.toLowerCase().includes('name')
    )?.value;

    const wifiPassword = listing.customFields?.find(
      (f: { fieldId: string; value: string }) =>
        f.fieldId.toLowerCase().includes('wifi') && f.fieldId.toLowerCase().includes('password')
    )?.value;

    // Get cover photo from pictures array (first picture is the cover)
    const coverPhoto = listing.pictures?.[0];
    const thumbnail = coverPhoto?.thumbnail || listing.picture?.thumbnail || '';
    const original = coverPhoto?.original || listing.picture?.regular || '';

    return {
      id: listing._id,
      nickname: listing.nickname || listing.title,
      title: listing.title,
      address: {
        full: listing.address?.full || '',
        street: listing.address?.street || '',
        city: listing.address?.city || '',
        state: listing.address?.state || '',
        zipcode: listing.address?.zipcode || '',
        country: listing.address?.country || '',
      },
      picture: {
        thumbnail,
        regular: original,
      },
      wifiName: wifiName || listing.wifiNetwork || '',
      wifiPassword: wifiPassword || listing.wifiPassword || '',
      checkInInstructions: listing.checkInInstructions || '',
      houseRules: listing.houseRules || '',
    };
  } catch (error) {
    console.error('Error fetching property:', error);
    return null;
  }
}

export async function getPayments(reservationId: string): Promise<Payment[]> {
  try {
    const data = await guestyFetch(
      `/reservations/${reservationId}/payments`
    );

    return (data || []).map((payment: {
      _id: string;
      amount: number;
      currency: string;
      status: string;
      createdAt: string;
      paidAt?: string;
      shouldBePaidAt?: string;
      note?: string;
    }) => {
      // Determine payment status
      let status: 'paid' | 'pending' | 'failed' | 'scheduled' = 'pending';
      if (payment.status === 'succeeded' || payment.paidAt) {
        status = 'paid';
      } else if (payment.status === 'failed') {
        status = 'failed';
      } else if (payment.shouldBePaidAt && !payment.paidAt) {
        status = 'scheduled';
      }

      return {
        id: payment._id,
        amount: payment.amount,
        currency: payment.currency || 'USD',
        status,
        date: payment.paidAt || payment.createdAt,
        description: payment.note || 'Payment',
        scheduledDate: payment.shouldBePaidAt,
      };
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
}
