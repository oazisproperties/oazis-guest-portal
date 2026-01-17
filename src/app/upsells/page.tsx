'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Upsell } from '@/types';

const categoryLabels: Record<string, string> = {
  all: 'All Add-ons',
  pool_heating: 'Pool Heating',
  early_checkin: 'Early Check-in',
  late_checkout: 'Late Check-out',
  extras: 'Extras',
  service: 'Services',
  event: 'Events',
};

export default function UpsellsPage() {
  const [upsells, setUpsells] = useState<Upsell[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [cart, setCart] = useState<Upsell[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const sessionData = localStorage.getItem('guestSession');
    if (!sessionData) {
      router.push('/login');
      return;
    }
    fetchUpsells();
  }, [router]);

  useEffect(() => {
    fetchUpsells(selectedCategory);
  }, [selectedCategory]);

  const fetchUpsells = async (category: string = 'all') => {
    try {
      const response = await fetch(`/api/upsells?category=${category}`);
      const data = await response.json();
      setUpsells(data.upsells || []);
    } catch (err) {
      console.error('Failed to fetch upsells:', err);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (upsell: Upsell) => {
    if (!cart.find((item) => item.id === upsell.id)) {
      setCart([...cart, upsell]);
    }
  };

  const removeFromCart = (upsellId: string) => {
    setCart(cart.filter((item) => item.id !== upsellId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0);

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
      const sessionData = localStorage.getItem('guestSession');
      const session = sessionData ? JSON.parse(sessionData) : null;

      const response = await fetch('/api/upsells/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cart.map((item) => item.id),
          reservationId: session?.reservationId,
        }),
      });

      const data = await response.json();

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oazis-purple"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-oazis-cream-light">
      <header className="bg-oazis-purple text-white sticky top-0 z-10">
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
        {/* Category Filters */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {Object.entries(categoryLabels).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                selectedCategory === key
                  ? 'bg-oazis-purple text-white'
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
            const inCart = cart.find((item) => item.id === upsell.id);
            return (
              <div
                key={upsell.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{upsell.name}</h3>
                  <span className="text-lg font-bold text-oazis-purple">
                    {formatCurrency(upsell.price, upsell.currency)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{upsell.description}</p>
                <button
                  onClick={() =>
                    inCart ? removeFromCart(upsell.id) : addToCart(upsell)
                  }
                  className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                    inCart
                      ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      : 'bg-oazis-purple text-white hover:bg-oazis-purple-dark'
                  }`}
                >
                  {inCart ? 'Remove from Cart' : 'Add to Cart'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Cart Footer */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  {cart.length} item{cart.length > 1 ? 's' : ''}
                </p>
                <p className="text-xl font-bold text-oazis-purple">
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
        )}
      </main>

      <footer className="pb-8 text-center text-sm text-gray-500">
        oAZis Properties &bull; Tucson, AZ
      </footer>
    </div>
  );
}
