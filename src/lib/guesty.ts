import { Reservation, Property, Payment } from '@/types';

const GUESTY_API_URL = 'https://open-api.guesty.com/v1';

async function getAccessToken(): Promise<string> {
  const response = await fetch('https://open-api.guesty.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.GUESTY_CLIENT_ID!,
      client_secret: process.env.GUESTY_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to get Guesty access token');
  }

  const data = await response.json();
  return data.access_token;
}

async function guestyFetch(endpoint: string) {
  const token = await getAccessToken();

  const response = await fetch(`${GUESTY_API_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Guesty API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getReservationByConfirmationCode(
  confirmationCode: string
): Promise<Reservation | null> {
  try {
    const data = await guestyFetch(
      `/reservations?filters=[{"field":"confirmationCode","operator":"$eq","value":"${confirmationCode}"}]`
    );

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
