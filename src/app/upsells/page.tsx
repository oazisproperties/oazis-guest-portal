'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Upsell, UpsellOption } from '@/types';

const categoryLabels: Record<string, string> = {
  add_ons: 'Add Ons',
  themed_packages: 'Themed Packages',
};

// Cart item includes the selected option if applicable
interface CartItem {
  upsell: Upsell;
  selectedOption?: UpsellOption;
}

// Existing upsell request from the backend
interface UpsellRequest {
  id: string;
  items: Array<{
    name: string;
    price: number;
    currency: string;
  }>;
  totalAmount: number;
  status: 'pending' | 'approved' | 'declined' | 'expired';
  createdAt: string;
}

export default function UpsellsPage() {
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('add_ons');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({}); // upsellId -> optionId
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [existingRequests, setExistingRequests] = useState<UpsellRequest[]>([]);
  const [reservationId, setReservationId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Check session via API (session stored in HTTP-only cookie)
    async function checkSessionAndFetch() {
      try {
        const sessionResponse = await fetch('/api/auth/session');
        if (!sessionResponse.ok) {
          router.push('/login');
          return;
        }

        const { session } = await sessionResponse.json();
        setPropertyId(session.listingId || null);
        setReservationId(session.reservationId || null);
        fetchUpsells('add_ons', session.listingId);
        fetchExistingRequests();
      } catch {
        router.push('/login');
      }
    }

    checkSessionAndFetch();
  }, [router]);

  const fetchExistingRequests = async () => {
    try {
      // API gets reservation ID from session cookie
      const response = await fetch('/api/upsells/requests');
      if (response.ok) {
        const data = await response.json();
        setExistingRequests(data.upsells || []);
      }
    } catch (err) {
      console.error('Failed to fetch existing requests:', err);
    }
  };

  useEffect(() => {
    if (propertyId !== null) {
      fetchUpsells(selectedCategory, propertyId);
    }
  }, [selectedCategory, propertyId]);

  const fetchUpsells = async (category: string = 'all', propId?: string | null) => {
    try {
      let url = `/api/upsells?category=${category}`;
      if (propId) {
        url += `&propertyId=${propId}`;
      }
      const response = await fetch(url);
      const data = await response.json();
      setUpsells(data.upsells || []);
    } catch (err) {
      console.error('Failed to fetch upsells:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionChange = (upsellId: string, optionId: string) => {
    setSelectedOptions((prev) => ({ ...prev, [upsellId]: optionId }));
  };

  const getSelectedPrice = (upsell: Upsell): number => {
    if (!upsell.options) return upsell.price;
    const selectedOptionId = selectedOptions[upsell.id];
    const option = upsell.options.find((o) => o.id === selectedOptionId);
    return option?.price || upsell.options[0].price;
  };

  const getSelectedOption = (upsell: Upsell): UpsellOption | undefined => {
    if (!upsell.options) return undefined;
    const selectedOptionId = selectedOptions[upsell.id];
    return upsell.options.find((o) => o.id === selectedOptionId) || upsell.options[0];
  };

  const addToCart = (upsell: Upsell) => {
    if (cart.find((item) => item.upsell.id === upsell.id)) return;

    const selectedOption = getSelectedOption(upsell);
    setCart([...cart, { upsell, selectedOption }]);
  };

  const removeFromCart = (upsellId: string) => {
    setCart(cart.filter((item) => item.upsell.id !== upsellId));
  };

  const getCartItemPrice = (item: CartItem): number => {
    return item.selectedOption?.price || item.upsell.price;
  };

  const cartTotal = cart.reduce((sum, item) => sum + getCartItemPrice(item), 0);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    setCheckoutLoading(true);
    try {
      // Send cart items with option IDs for proper pricing
      // API gets reservation ID from session cookie
      const items = cart.map((item) => ({
        upsellId: item.upsell.id,
        optionId: item.selectedOption?.id,
      }));

      const response = await fetch('/api/upsells/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items }),
      });

      const data = await response.json();

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Checkout error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oazis-cream-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oazis-teal"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oazis-cream-light">
      <header className="bg-oazis-teal text-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-oazis-cream hover:text-white transition">
              ← Back
            </Link>
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="oAZis Properties"
                width={32}
                height={32}
                className="rounded-full bg-white p-0.5"
              />
              <h1 className="text-xl font-semibold">Add-ons</h1>
            </div>
          </div>
          {cart.length > 0 && (
            <div className="text-sm text-oazis-cream">
              {cart.length} item{cart.length > 1 ? 's' : ''} in cart
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Existing Requests */}
        {existingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Requests</h2>
            <div className="space-y-3">
              {existingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        request.status === 'approved'
                          ? 'bg-green-100 text-green-800'
                          : request.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : request.status === 'declined'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {request.status === 'approved'
                        ? '✓ Approved'
                        : request.status === 'pending'
                        ? '⏳ Pending Approval'
                        : request.status === 'declined'
                        ? '✗ Declined'
                        : 'Expired'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {request.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-gray-700">{item.name}</span>
                        <span className="text-gray-900 font-medium">
                          {formatCurrency(item.price, item.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-100 flex justify-between">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-sm font-bold text-oazis-teal-heading">
                      {formatCurrency(request.totalAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === key
                  ? 'bg-oazis-teal text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Upsells Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-24">
          {upsells.map((upsell) => {
            const inCart = cart.find((item) => item.upsell.id === upsell.id);
            const hasOptions = upsell.options && upsell.options.length > 0;
            const displayPrice = getSelectedPrice(upsell);
            const currentOptionId = selectedOptions[upsell.id] || upsell.options?.[0]?.id;

            return (
              <div
                key={upsell.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{upsell.name}</h3>
                  <span className="text-lg font-bold text-oazis-teal-heading">
                    {hasOptions ? `From ${formatCurrency(upsell.price, upsell.currency)}` : formatCurrency(upsell.price, upsell.currency)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{upsell.description}</p>

                {/* Options Selector */}
                {hasOptions && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select an option:
                    </label>
                    <div className="space-y-2">
                      {upsell.options!.map((option) => (
                        <label
                          key={option.id}
                          className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition ${
                            currentOptionId === option.id
                              ? 'border-oazis-teal bg-oazis-teal/10'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name={`option-${upsell.id}`}
                              value={option.id}
                              checked={currentOptionId === option.id}
                              onChange={() => handleOptionChange(upsell.id, option.id)}
                              className="text-oazis-teal-heading focus:ring-oazis-purple"
                            />
                            <span className="text-sm text-gray-900">{option.label}</span>
                          </div>
                          <span className="text-sm font-semibold text-oazis-teal-heading">
                            {formatCurrency(option.price, upsell.currency)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() =>
                    inCart ? removeFromCart(upsell.id) : addToCart(upsell)
                  }
                  className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                    inCart
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-oazis-teal text-white hover:bg-oazis-teal-dark'
                  }`}
                >
                  {inCart ? 'Remove from Cart' : `Add to Cart - ${formatCurrency(displayPrice, upsell.currency)}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              {/* Cart items summary */}
              <div className="mb-3 space-y-1">
                {cart.map((item) => (
                  <div key={item.upsell.id} className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {item.upsell.name}
                      {item.selectedOption && (
                        <span className="text-gray-400"> - {item.selectedOption.label}</span>
                      )}
                    </span>
                    <span className="text-gray-900">{formatCurrency(getCartItemPrice(item))}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div>
                  <p className="text-sm text-gray-600">
                    {cart.length} item{cart.length > 1 ? 's' : ''}
                  </p>
                  <p className="text-xl font-bold text-oazis-teal-heading">
                    {formatCurrency(cartTotal)}
                  </p>
                </div>
                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading}
                  className="bg-oazis-orange text-white px-8 py-3 rounded-lg font-medium hover:bg-oazis-orange-dark transition disabled:opacity-50"
                >
                  {checkoutLoading ? 'Processing...' : 'Checkout'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="pb-8 text-center text-sm text-gray-500">
        <p className="mb-2">oAZis Properties &bull; Tucson, AZ</p>
        <p className="space-x-4">
          <a href="mailto:stay@oazisproperties.com" className="hover:text-oazis-teal-heading transition">
            stay@oazisproperties.com
          </a>
          <span>&bull;</span>
          <a href="tel:+15206000434" className="hover:text-oazis-teal-heading transition">
            (520) 600-0434
          </a>
        </p>
      </footer>
    </div>
  );
}
