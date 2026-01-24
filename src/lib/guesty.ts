import { Reservation, Property, Payment } from '@/types';
import { Redis } from '@upstash/redis';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';
const TOKEN_CACHE_KEY = 'guesty_access_token';
const PORTAL_CODE_FIELD_ID = '696db156c6cd55001401cdf1'; // MongoDB ObjectId for portal_code custom field

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

async function guestyPut(endpoint: string, body: Record<string, unknown>) {
  const token = await getAccessToken();
  const url = `${GUESTY_API_URL}${endpoint}`;

  console.log('Guesty API PUT:', url, JSON.stringify(body));

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error('Guesty API PUT error:', response.status, responseText);
    throw new Error(`Guesty API error: ${response.status} - ${responseText}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

// Get custom field definitions from Guesty
export async function getCustomFields(): Promise<Array<{ _id: string; fieldId: string; title: string }>> {
  try {
    const data = await guestyFetch('/custom-fields', { entity: 'reservation' });
    return data || [];
  } catch (error) {
    console.error('Error fetching custom fields:', error);
    return [];
  }
}

// Get the MongoDB ID for a custom field by its fieldId/name
export async function getCustomFieldId(fieldName: string): Promise<string | null> {
  const fields = await getCustomFields();
  const field = fields.find(
    (f) => f.fieldId === fieldName || f.title?.toLowerCase() === fieldName.toLowerCase()
  );
  return field?._id || null;
}

// Generate a random 6-letter uppercase code
export function generatePortalCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // Excluding I and O to avoid confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

// Sync portal code to Guesty using the custom fields API
export async function syncPortalCodeToGuesty(
  reservationId: string,
  portalCode: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = await getAccessToken();
    const code = portalCode.toUpperCase();

    console.log(`Syncing portal code ${code} to Guesty reservation ${reservationId} (field ID: ${PORTAL_CODE_FIELD_ID})`);

    // Use the dedicated custom fields endpoint
    const response = await fetch(
      `${GUESTY_API_URL}/reservations/${reservationId}/custom-fields`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customFields: [
            {
              fieldId: PORTAL_CODE_FIELD_ID,
              value: code,
            },
          ],
        }),
      }
    );

    const responseText = await response.text();

    if (response.ok) {
      console.log(`Successfully synced portal_code ${code} to Guesty reservation ${reservationId}`);
      return { success: true };
    }

    console.error('Failed to sync portal code to Guesty:', response.status, responseText);
    return { success: false, error: `Guesty API error: ${response.status} - ${responseText}` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error syncing portal code to Guesty:', errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Legacy function - kept for backwards compatibility
export async function updateReservationPortalCode(
  reservationId: string,
  portalCode: string
): Promise<{ success: boolean; error?: string }> {
  return syncPortalCodeToGuesty(reservationId, portalCode);
}

// Check if a portal code already exists
export async function portalCodeExists(code: string): Promise<boolean> {
  try {
    const filters = JSON.stringify([
      { operator: '$eq', field: 'customFields.portal_code', value: code }
    ]);
    const data = await guestyFetch('/reservations', { filters });
    return data.results && data.results.length > 0;
  } catch {
    return false;
  }
}

// Generate a unique portal code (checks for duplicates)
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

  // Fallback: add timestamp suffix if we can't find unique code
  return generatePortalCode() + Date.now().toString(36).slice(-2).toUpperCase();
}

export async function getReservationByConfirmationCode(
  confirmationCode: string
): Promise<Reservation | null> {
  // Import here to avoid circular dependency
  const { getReservationIdByPortalCode } = await import('./portal-codes');

  try {
    // Strategy 0: Check Redis for portal codes (6-letter codes)
    // Portal codes are 6 uppercase letters
    const isLikelyPortalCode = /^[A-Z]{6}$/i.test(confirmationCode.trim());
    if (isLikelyPortalCode) {
      const reservationId = await getReservationIdByPortalCode(confirmationCode);
      if (reservationId) {
        console.log('Found reservation via Redis portal code:', reservationId);
        return await getReservationById(reservationId);
      }
      console.log('Portal code not found in Redis, trying other strategies...');
    }

    // Strategy 1: Exact match with $in operator
    let filters = JSON.stringify([
      { operator: '$in', field: 'confirmationCode', value: [confirmationCode] }
    ]);

    let data = await guestyFetch('/reservations', { filters });
    console.log('Guesty search (confirmationCode):', data.results?.length || 0, 'found');

    // Strategy 2: If not found, try searching by guestyConfirmationCode (for manual reservations)
    if (!data.results || data.results.length === 0) {
      filters = JSON.stringify([
        { operator: '$in', field: 'guestyConfirmationCode', value: [confirmationCode] }
      ]);
      data = await guestyFetch('/reservations', { filters });
      console.log('Guesty search (guestyConfirmationCode):', data.results?.length || 0, 'found');
    }

    // Strategy 3: If still not found, try text search but verify the match
    if (!data.results || data.results.length === 0) {
      data = await guestyFetch('/reservations', { q: confirmationCode });
      console.log('Guesty search (text search):', data.results?.length || 0, 'found');

      // Filter text search results to only include actual confirmation code matches
      if (data.results && data.results.length > 0) {
        const normalizedInput = confirmationCode.toUpperCase().trim();
        data.results = data.results.filter((res: { confirmationCode?: string; guestyConfirmationCode?: string }) => {
          const code1 = (res.confirmationCode || '').toUpperCase().trim();
          const code2 = (res.guestyConfirmationCode || '').toUpperCase().trim();
          return code1 === normalizedInput || code2 === normalizedInput;
        });
        console.log('Guesty search (text search after filter):', data.results.length, 'matched');
      }
    }

    if (data.results && data.results.length > 0) {
      const res = data.results[0];
      return {
        id: res._id,
        confirmationCode: res.confirmationCode || res.guestyConfirmationCode,
        guestName: res.guest?.fullName || 'Guest',
        guestEmail: res.guest?.email || '',
        checkIn: res.checkInDateLocalized || res.checkIn,
        checkOut: res.checkOutDateLocalized || res.checkOut,
        checkInTime: res.plannedArrival || res.listing?.defaultCheckInTime || '15:00',
        checkOutTime: res.plannedDeparture || res.listing?.defaultCheckOutTime || '11:00',
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

    // Log available custom fields for debugging
    if (listing.customFields && listing.customFields.length > 0) {
      console.log('Available custom fields:', listing.customFields.map((f: { fieldId: string }) => f.fieldId));
    }

    // Get custom fields for WiFi info - try multiple field name patterns
    const wifiNameField = listing.customFields?.find(
      (f: { fieldId: string; value: string }) => {
        const fieldId = f.fieldId.toLowerCase();
        return (
          (fieldId.includes('wifi') && (fieldId.includes('name') || fieldId.includes('network') || fieldId.includes('ssid'))) ||
          fieldId === 'wifi_name' ||
          fieldId === 'wifiname' ||
          fieldId === 'wifi_network' ||
          fieldId === 'wifi_ssid'
        );
      }
    );

    const wifiPasswordField = listing.customFields?.find(
      (f: { fieldId: string; value: string }) => {
        const fieldId = f.fieldId.toLowerCase();
        return (
          (fieldId.includes('wifi') && (fieldId.includes('password') || fieldId.includes('pass') || fieldId.includes('key'))) ||
          fieldId === 'wifi_password' ||
          fieldId === 'wifipassword' ||
          fieldId === 'wifi_pass'
        );
      }
    );

    const wifiName = wifiNameField?.value;
    const wifiPassword = wifiPasswordField?.value;

    // Log what we found
    console.log('WiFi from customFields - Name:', wifiName || 'not found', 'Password:', wifiPassword ? '[set]' : 'not found');
    console.log('WiFi from listing fields - wifiNetwork:', listing.wifiNetwork || 'not found', 'wifiPassword:', listing.wifiPassword ? '[set]' : 'not found');

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
