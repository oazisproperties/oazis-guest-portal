'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Payment } from '@/types';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const sessionData = localStorage.getItem('guestSession');
    if (!sessionData) {
      router.push('/login');
      return;
    }

    const session = JSON.parse(sessionData);
    fetchPayments(session.reservationId);
  }, [router]);

  const fetchPayments = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/reservation?id=${reservationId}`);
      const data = await response.json();
      setPayments(data.payments || []);
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
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
      <header className="bg-oazis-purple text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
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
            <h1 className="text-xl font-semibold">Payment History</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {payments.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No payments recorded yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <div key={payment.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{payment.description}</p>
                    <p className="text-sm text-gray-500">{formatDate(payment.date)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </p>
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        payment.status === 'paid'
                          ? 'bg-oazis-teal/20 text-oazis-teal'
                          : payment.status === 'pending'
                          ? 'bg-oazis-orange/20 text-oazis-orange'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {payment.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="mt-12 pb-8 text-center text-sm text-gray-500">
        oAZis Properties &bull; Tucson, AZ
      </footer>
    </div>
  );
}
