import { Upsell } from '@/types';

// Static upsells catalog - you can later move this to a database or CMS
export const upsellsCatalog: Upsell[] = [
  {
    id: 'early-checkin-1',
    name: 'Early Check-in (1 hour)',
    description: 'Arrive 1 hour before standard check-in time.',
    price: 25,
    currency: 'USD',
    category: 'early_checkin',
  },
  {
    id: 'early-checkin-2',
    name: 'Early Check-in (2 hours)',
    description: 'Arrive 2 hours before standard check-in time.',
    price: 45,
    currency: 'USD',
    category: 'early_checkin',
  },
  {
    id: 'early-checkin-3',
    name: 'Early Check-in (3+ hours)',
    description: 'Arrive 3 or more hours before standard check-in time. Subject to availability.',
    price: 75,
    currency: 'USD',
    category: 'early_checkin',
  },
  {
    id: 'late-checkout-1',
    name: 'Late Check-out (1 hour)',
    description: 'Stay 1 hour past standard check-out time.',
    price: 25,
    currency: 'USD',
    category: 'late_checkout',
  },
  {
    id: 'late-checkout-2',
    name: 'Late Check-out (2 hours)',
    description: 'Stay 2 hours past standard check-out time.',
    price: 45,
    currency: 'USD',
    category: 'late_checkout',
  },
  {
    id: 'late-checkout-3',
    name: 'Late Check-out (3+ hours)',
    description: 'Stay 3 or more hours past standard check-out time. Subject to availability.',
    price: 75,
    currency: 'USD',
    category: 'late_checkout',
  },
  {
    id: 'grocery-stocking',
    name: 'Grocery Pre-stocking',
    description: 'We\'ll stock your fridge with essentials before you arrive. Send us your list!',
    price: 50,
    currency: 'USD',
    category: 'service',
  },
  {
    id: 'mid-stay-clean',
    name: 'Mid-Stay Cleaning',
    description: 'Professional cleaning service during your stay.',
    price: 75,
    currency: 'USD',
    category: 'service',
  },
  {
    id: 'airport-transfer',
    name: 'Airport Transfer',
    description: 'Private car service to/from the airport.',
    price: 60,
    currency: 'USD',
    category: 'service',
  },
  {
    id: 'local-tour',
    name: 'Local Area Tour',
    description: 'Guided tour of local attractions and hidden gems.',
    price: 100,
    currency: 'USD',
    category: 'experience',
  },
  {
    id: 'chef-dinner',
    name: 'Private Chef Dinner',
    description: 'In-home dining experience with a professional chef.',
    price: 200,
    currency: 'USD',
    category: 'experience',
  },
];

export function getUpsellsByCategory(category?: string): Upsell[] {
  if (!category || category === 'all') {
    return upsellsCatalog;
  }
  return upsellsCatalog.filter((u) => u.category === category);
}

export function getUpsellById(id: string): Upsell | undefined {
  return upsellsCatalog.find((u) => u.id === id);
}
