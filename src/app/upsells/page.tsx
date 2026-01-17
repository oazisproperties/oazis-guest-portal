'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upsell } from '@/types';

const categoryLabels: Record<string, string> = {
  all: 'All Add-ons',
  early_checkin: 'Early Check-in',
  late_checkout: 'Late Check-out',
  service: 'Services',
  experience: 'Experiences',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-slate-600 hover:text-slate-900">
              ← Back
            </Link>
            <h1 className="text-xl font-semibold text-slate-900">Add-ons</h1>
          </div>
          {cart.length > 0 && (
            <div className="text-sm text-slate-600">
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
                  ? 'bg-slate-900 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
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
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-6"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-slate-900">{upsell.name}</h3>
                  <span className="text-lg font-bold text-slate-900">
                    {formatCurrency(upsell.price, upsell.currency)}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mb-4">{upsell.description}</p>
                <button
                  onClick={() =>
                    inCart ? removeFromCart(upsell.id) : addToCart(upsell)
                  }
                  className={`w-full py-2 px-4 rounded-lg font-medium transition ${
                    inCart
                      ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      : 'bg-slate-900 text-white hover:bg-slate-800'
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
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">
                  {cart.length} item{cart.length > 1 ? 's' : ''}
                </p>
                <p className="text-xl font-bold text-slate-900">
                  {formatCurrency(cartTotal)}
                </p>
              </div>
              <button
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="bg-slate-900 text-white px-8 py-3 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50"
              >
                {checkoutLoading ? 'Processing...' : 'Checkout'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
