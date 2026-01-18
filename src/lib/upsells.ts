import { Upsell } from '@/types';

// oAZis Properties upsells catalog
export const upsellsCatalog: Upsell[] = [
  // Pool Heating - consolidated with temperature options
  {
    id: 'pool-heating',
    name: 'Pool Heating',
    description: 'Looking for a warmer swimming experience? Select your preferred temperature. Please request at least 3 days in advance.',
    price: 100, // Starting price
    currency: 'USD',
    category: 'pool_heating',
    options: [
      { id: 'pool-heat-80', label: '80°F - Comfortable', price: 100 },
      { id: 'pool-heat-83', label: '83°F - Toasty', price: 125 },
      { id: 'pool-heat-85', label: '85°F - Luxurious', price: 150 },
    ],
  },

  // Early Check-In - consolidated with time options
  {
    id: 'early-checkin',
    name: 'Early Check-In',
    description: 'Request to check in early. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 20, // Starting price
    currency: 'USD',
    category: 'early_checkin',
    options: [
      { id: 'early-checkin-2hr', label: '2 hours early', price: 20 },
      { id: 'early-checkin-4hr', label: '4 hours early', price: 40 },
      { id: 'early-checkin-6hr', label: '6 hours early', price: 60 },
    ],
  },

  // Late Check-Out - consolidated with time options
  {
    id: 'late-checkout',
    name: 'Late Check-Out',
    description: 'Request to check out late. Note: This is a request and not guaranteed. A $50 hold will be placed and charged only if approved.',
    price: 20, // Starting price
    currency: 'USD',
    category: 'late_checkout',
    options: [
      { id: 'late-checkout-2hr', label: '2 hours late', price: 20 },
      { id: 'late-checkout-4hr', label: '4 hours late', price: 40 },
      { id: 'late-checkout-6hr', label: '6 hours late', price: 60 },
    ],
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

  // Events - consolidated with size options
  {
    id: 'event',
    name: 'Event Package',
    description: 'Hosting a pool party, birthday, wedding, or family reunion? Select the package that fits your gathering size. We\'ll help make your event smooth and stress-free.',
    price: 500, // Starting price
    currency: 'USD',
    category: 'event',
    options: [
      { id: 'event-small', label: 'Small (10-19 guests)', price: 500 },
      { id: 'event-medium', label: 'Medium (20-29 guests)', price: 1000 },
      { id: 'event-large', label: 'Large (30-40 guests)', price: 1500 },
    ],
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

// Get specific option from an upsell
export function getUpsellOption(upsellId: string, optionId: string): { upsell: Upsell; option: { id: string; label: string; price: number } } | undefined {
  const upsell = upsellsCatalog.find((u) => u.id === upsellId);
  if (!upsell) return undefined;

  const option = upsell.options?.find((o) => o.id === optionId);
  if (!option) return undefined;

  return { upsell, option };
}
