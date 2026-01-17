import { Upsell } from '@/types';

// oAZis Properties upsells catalog
export const upsellsCatalog: Upsell[] = [
  // Pool Heating
  {
    id: 'pool-heat-80',
    name: 'Pool Heating - 80°F',
    description: 'Looking for a warmer swimming experience? We\'ll heat the pool to a comfortable 80°F. Please request at least 3 days in advance.',
    price: 100,
    currency: 'USD',
    category: 'pool_heating',
  },
  {
    id: 'pool-heat-83',
    name: 'Pool Heating - 83°F',
    description: 'Looking for a warmer swimming experience? We\'ll heat the pool to a toasty 83°F. Please request at least 3 days in advance.',
    price: 125,
    currency: 'USD',
    category: 'pool_heating',
  },
  {
    id: 'pool-heat-85',
    name: 'Pool Heating - 85°F',
    description: 'Looking for a warmer swimming experience? We\'ll heat the pool to a luxurious 85°F. Please request at least 3 days in advance.',
    price: 150,
    currency: 'USD',
    category: 'pool_heating',
  },

  // Early Check-In
  {
    id: 'early-checkin-2hr',
    name: 'Early Check-In (2 hours)',
    description: 'Request to check in 2 hours early. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 20,
    currency: 'USD',
    category: 'early_checkin',
  },
  {
    id: 'early-checkin-4hr',
    name: 'Early Check-In (4 hours)',
    description: 'Request to check in 4 hours early. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 40,
    currency: 'USD',
    category: 'early_checkin',
  },
  {
    id: 'early-checkin-6hr',
    name: 'Early Check-In (6 hours)',
    description: 'Request to check in 6 hours early. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 60,
    currency: 'USD',
    category: 'early_checkin',
  },

  // Late Check-Out
  {
    id: 'late-checkout-2hr',
    name: 'Late Check-Out (2 hours)',
    description: 'Request to check out 2 hours late. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 20,
    currency: 'USD',
    category: 'late_checkout',
  },
  {
    id: 'late-checkout-4hr',
    name: 'Late Check-Out (4 hours)',
    description: 'Request to check out 4 hours late. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 40,
    currency: 'USD',
    category: 'late_checkout',
  },
  {
    id: 'late-checkout-6hr',
    name: 'Late Check-Out (6 hours)',
    description: 'Request to check out 6 hours late. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 60,
    currency: 'USD',
    category: 'late_checkout',
  },

  // Extras
  {
    id: 'chex-mix',
    name: 'Extra Signature Chex Mix',
    description: 'Did you enjoy our Signature Chex Mix? Order some more for your trip home! We\'ll pack it up and drop it off before your stay is done. Let us know if you want more of the sweet or salty mix.',
    price: 10,
    currency: 'USD',
    category: 'extras',
  },

  // Services
  {
    id: 'grocery-delivery',
    name: 'Grocery Delivery Service',
    description: 'Skip the shopping trip! Send us your list at least 48 hours before arrival and we\'ll stock your fridge and pantry. We accommodate special requests and dietary preferences. Fee includes shopping & stocking; groceries billed separately.',
    price: 100,
    currency: 'USD',
    category: 'service',
  },
  {
    id: 'mid-stay-clean',
    name: 'Mid-Stay Cleaning',
    description: 'Request a mid-stay clean to refresh your space during your stay. Select your preferred date and we\'ll only charge your card if we\'re able to schedule it.',
    price: 75,
    currency: 'USD',
    category: 'service',
  },

  // Events
  {
    id: 'event-small',
    name: 'Event - Small (10-19 guests)',
    description: 'Hosting a pool party, birthday, wedding, or family reunion? This covers a small gathering of 10-19 guests. We\'ll help make your event smooth and stress-free.',
    price: 500,
    currency: 'USD',
    category: 'event',
  },
  {
    id: 'event-medium',
    name: 'Event - Medium (20-29 guests)',
    description: 'Hosting a pool party, birthday, wedding, or family reunion? This covers a medium gathering of 20-29 guests. We\'ll help make your event smooth and stress-free.',
    price: 1000,
    currency: 'USD',
    category: 'event',
  },
  {
    id: 'event-large',
    name: 'Event - Large (30-40 guests)',
    description: 'Hosting a pool party, birthday, wedding, or family reunion? This covers a larger gathering of 30-40 guests. We\'ll help make your event smooth and stress-free.',
    price: 1500,
    currency: 'USD',
    category: 'event',
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
