'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
      <div className="min-h-screen flex items-center justify-center bg-oazis-cream-light">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-oazis-purple mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your reservation...</p>
        </div>
      </div>
    );
  }

  if (error || !reservation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-oazis-cream-light px-4">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Reservation not found'}</p>
          <button
            onClick={() => router.push('/login')}
            className="text-oazis-purple underline"
          >
            Return to login
          </button>
        </div>
      </div>
    );
  }

  const property = reservation.listing;

  return (
    <div className="min-h-screen bg-oazis-cream-light">
      {/* Header */}
      <header className="bg-oazis-purple text-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="oAZis Properties"
              width={40}
              height={40}
              className="rounded-full bg-white p-1"
            />
            <h1 className="text-xl font-semibold">Guest Portal</h1>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-oazis-cream hover:text-white transition"
          >
            Log out
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-oazis-purple">
            Welcome, {reservation.guestName}!
          </h2>
          <p className="text-gray-600 mt-1">
            Confirmation: <span className="font-mono text-oazis-teal">{reservation.confirmationCode}</span>
          </p>
        </div>

        {/* Property Card */}
        {property && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            {property.picture?.regular && (
              <img
                src={property.picture.regular}
                alt={property.nickname}
                className="w-full h-48 object-cover"
              />
            )}
            <div className="p-6">
              <h3 className="text-xl font-semibold text-oazis-purple mb-2">
                {property.nickname}
              </h3>
              <p className="text-gray-600">{property.address.full}</p>
            </div>
          </div>
        )}

        {/* Check-in/out Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-oazis-teal/20 rounded-full flex items-center justify-center">
                <span className="text-oazis-teal text-lg">→</span>
              </div>
              <span className="text-sm font-medium text-gray-500">CHECK-IN</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(reservation.checkIn)}
            </p>
            <p className="text-gray-600">After {reservation.checkInTime}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-oazis-orange/20 rounded-full flex items-center justify-center">
                <span className="text-oazis-orange text-lg">←</span>
              </div>
              <span className="text-sm font-medium text-gray-500">CHECK-OUT</span>
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {formatDate(reservation.checkOut)}
            </p>
            <p className="text-gray-600">Before {reservation.checkOutTime}</p>
          </div>
        </div>

        {/* WiFi Info */}
        {property?.wifiName && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="font-semibold text-oazis-purple mb-4">WiFi Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Network Name</p>
                <p className="font-medium text-gray-900">{property.wifiName}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Password</p>
                <p className="font-medium text-gray-900 font-mono">
                  {property.wifiPassword}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="font-semibold text-oazis-purple mb-4">Payment Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Paid</span>
              <span className="font-medium text-oazis-teal">
                {formatCurrency(reservation.money?.totalPaid || 0, reservation.money?.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Balance Due</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(reservation.money?.balanceDue || 0, reservation.money?.currency)}
              </span>
            </div>
          </div>
          {payments.length > 0 && (
            <Link
              href="/payments"
              className="block mt-4 text-center text-sm text-oazis-purple hover:text-oazis-purple-dark"
            >
              View payment history →
            </Link>
          )}
        </div>

        {/* Upsells CTA */}
        <div className="bg-gradient-to-r from-oazis-purple to-oazis-purple-dark rounded-xl p-6 text-white">
          <h3 className="font-semibold text-lg mb-2">Enhance Your Stay</h3>
          <p className="text-oazis-cream mb-4">
            Add early check-in, late checkout, or explore local experiences.
          </p>
          <Link
            href="/upsells"
            className="inline-block bg-oazis-orange text-white px-6 py-2 rounded-lg font-medium hover:bg-oazis-orange-dark transition"
          >
            Browse Add-ons
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center text-sm text-gray-500">
        oAZis Properties &bull; Tucson, AZ
      </footer>
    </div>
  );
}
