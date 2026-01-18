import { Reservation, Property, Payment } from '@/types';

// Demo property data
export const demoProperty: Property = {
  id: 'demo-property-001',
  nickname: 'Desert Oasis Retreat',
  title: 'Stunning 4BR Desert Oasis with Pool & Mountain Views',
  address: {
    full: '1234 Saguaro Canyon Drive, Tucson, AZ 85750',
    street: '1234 Saguaro Canyon Drive',
    city: 'Tucson',
    state: 'AZ',
    zipcode: '85750',
    country: 'US',
  },
  picture: {
    thumbnail: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400',
    regular: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200',
  },
  wifiName: 'DesertOasis_Guest',
  wifiPassword: 'Welcome2Tucson!',
  checkInInstructions: 'The lockbox code will be sent 24 hours before check-in.',
  houseRules: 'No smoking. No parties. Quiet hours 10pm-8am.',
};

// Demo reservation data
export const demoReservation: Reservation = {
  id: 'demo-reservation-001',
  confirmationCode: 'DEMO123',
  guestName: 'Jordan Smith',
  guestEmail: 'jordan.smith@example.com',
  checkIn: getFutureDate(2), // 2 days from now
  checkOut: getFutureDate(7), // 7 days from now
  checkInTime: '16:00',
  checkOutTime: '11:00',
  status: 'confirmed',
  listingId: 'demo-property-001',
  listing: demoProperty,
  money: {
    totalPaid: 850,
    balanceDue: 425,
    currency: 'USD',
  },
};

// Demo payments data
export const demoPayments: Payment[] = [
  {
    id: 'demo-payment-001',
    amount: 425,
    currency: 'USD',
    status: 'paid',
    date: getPastDate(14), // 14 days ago
    description: 'Initial deposit',
  },
  {
    id: 'demo-payment-002',
    amount: 425,
    currency: 'USD',
    status: 'paid',
    date: getPastDate(7), // 7 days ago
    description: 'Second payment',
  },
  {
    id: 'demo-payment-003',
    amount: 425,
    currency: 'USD',
    status: 'scheduled',
    date: new Date().toISOString(),
    description: 'Final payment',
    scheduledDate: getFutureDate(1), // Due tomorrow
  },
];

// Helper functions for dynamic dates
function getFutureDate(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function getPastDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

// Check if a confirmation code is the demo code
export function isDemoCode(code: string): boolean {
  return code.toUpperCase() === 'DEMO' || code.toUpperCase() === 'DEMO123';
}
