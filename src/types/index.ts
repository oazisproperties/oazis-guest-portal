// Reservation types
export interface Reservation {
  id: string;
  confirmationCode: string;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkOutTime: string;
  status: string;
  listingId: string;
  listing?: Property;
  money?: {
    totalPaid: number;
    balanceDue: number;
    currency: string;
  };
}

// Property types
export interface Property {
  id: string;
  nickname: string;
  title: string;
  address: {
    full: string;
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
  picture?: {
    thumbnail: string;
    regular: string;
  };
  wifiName?: string;
  wifiPassword?: string;
  checkInInstructions?: string;
  houseRules?: string;
}

// Payment types
export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  date: string;
  description: string;
}

// Upsell types
export interface Upsell {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: 'early_checkin' | 'late_checkout' | 'service' | 'experience';
  image?: string;
}

// Auth types
export interface GuestSession {
  reservationId: string;
  confirmationCode: string;
  guestName: string;
  listingId: string;
}
