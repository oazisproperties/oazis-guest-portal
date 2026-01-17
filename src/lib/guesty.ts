import { Reservation, Property, Payment } from '@/types';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';

// Token cache to avoid rate limits (tokens are valid for 24 hours)
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getAccessToken(): Promise<string> {
  // Check for manually provided token first (useful when rate limited)
  if (process.env.GUESTY_ACCESS_TOKEN) {
    console.log('Using manually provided Guesty access token');
    return process.env.GUESTY_ACCESS_TOKEN;
  }

  // Return cached token if still valid (with 5 minute buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    console.log('Using cached Guesty access token');
    return cachedToken;
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

  // Cache the token (expires_in is in seconds, typically 86400 = 24 hours)
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);

  console.log('Got new Guesty access token, valid for', data.expires_in, 'seconds');

  return cachedToken;
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
        thumbnail: listing.picture?.thumbnail || '',
        regular: listing.picture?.regular || '',
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
      note?: string;
    }) => ({
      id: payment._id,
      amount: payment.amount,
      currency: payment.currency || 'USD',
      status: payment.status === 'succeeded' ? 'paid' : payment.status,
      date: payment.createdAt,
      description: payment.note || 'Payment',
    }));
  } catch (error) {
    console.error('Error fetching payments:', error);
    return [];
  }
}
