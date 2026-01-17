'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Reservation, Payment } from '@/types';

export default function DashboardPage() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const sessionData = localStorage.getItem('guestSession');
    if (!sessionData) {
      router.push('/login');
      return;
    }

    const session = JSON.parse(sessionData);
    fetchReservationData(session.reservationId);
  }, [router]);

  const fetchReservationData = async (reservationId: string) => {
    try {
      const response = await fetch(`/api/reservation?id=${reservationId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setReservation(data.reservation);
      setPayments(data.payments);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('guestSession');
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading your reservation...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Reservation not found'}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-slate-900 underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  const property = reservation.listing;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-900">Guest Portal</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-slate-600 hover:text-slate-900"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900">
            Welcome, {reservation.guestName}!
          </h2>
          <p className="text-slate-600 mt-1">
            Confirmation: {reservation.confirmationCode}
          </p>
        </div>

        {/* Property Card */}
        {property && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {property.picture?.regular && (
              <img
                src={property.picture.regular}
                alt={property.nickname}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                {property.nickname}
              </h3>
              <p className="text-slate-600">{property.address.full}</p>
            </div>
          </div>
        )}

        {/* Check-in/out Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 text-lg">→</span>
              </div>
              <span className="text-sm font-medium text-slate-500">CHECK-IN</span>
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {formatDate(reservation.checkIn)}
            </p>
            <p className="text-slate-600">After {reservation.checkInTime}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 text-lg">←</span>
              </div>
              <span className="text-sm font-medium text-slate-500">CHECK-OUT</span>
            </div>
            <p className="text-lg font-semibold text-slate-900">
              {formatDate(reservation.checkOut)}
            </p>
            <p className="text-slate-600">Before {reservation.checkOutTime}</p>
          </div>
        </div>

        {/* WiFi Info */}
        {property?.wifiName && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
            <h3 className="font-semibold text-slate-900 mb-4">WiFi Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-500">Network Name</p>
                <p className="font-medium text-slate-900">{property.wifiName}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Password</p>
                <p className="font-medium text-slate-900 font-mono">
                  {property.wifiPassword}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
          <h3 className="font-semibold text-slate-900 mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-600">Total Paid</span>
              <span className="font-medium text-green-600">
                {formatCurrency(reservation.money?.totalPaid || 0, reservation.money?.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Balance Due</span>
              <span className="font-medium text-slate-900">
                {formatCurrency(reservation.money?.balanceDue || 0, reservation.money?.currency)}
              </span>
            </div>
          </div>
          {payments.length > 0 && (
            <Link
              href="/payments"
              className="block mt-4 text-center text-sm text-slate-600 hover:text-slate-900"
            >
              View payment history →
            </Link>
          )}
        </div>

        {/* Upsells CTA */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl p-6 text-white">
          <h3 className="font-semibold text-lg mb-2">Enhance Your Stay</h3>
          <p className="text-slate-300 mb-4">
            Add early check-in, late checkout, or explore local experiences.
          </p>
          <Link
            href="/upsells"
            className="inline-block bg-white text-slate-900 px-6 py-2 rounded-lg font-medium hover:bg-slate-100 transition"
          >
            Browse Add-ons
          </Link>
        </div>
      </main>
    </div>
  );
}
