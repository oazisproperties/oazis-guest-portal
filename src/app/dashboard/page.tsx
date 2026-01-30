'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Reservation, Payment } from '@/types';

export default function DashboardPage() {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [houseManualUrl, setHouseManualUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

        // Session is valid, fetch reservation data
        fetchReservationData();
      } catch {
        router.push('/login');
      }
    }

    checkSessionAndFetch();
  }, [router]);

  const fetchReservationData = async () => {
    try {
      // API now gets reservation ID from session cookie
      const response = await fetch('/api/reservation');
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(data.error);
      }

      setReservation(data.reservation);
      setPayments(data.payments);
      setHouseManualUrl(data.houseManualUrl || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Continue with redirect even if logout API fails
    }
    router.push('/login');
  };

  const formatDate = (dateString: string) => {
    // Parse date string as local time to avoid timezone shift
    // Input format: "2026-01-20" or "2026-01-20T00:00:00.000Z"
    const datePart = dateString.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed

    return date.toLocaleDateString('en-US', {
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

  // Extract first name from full name
  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
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
  const guestFirstName = getFirstName(reservation.guestName);

  return (
    <div className="min-h-screen bg-oazis-cream-light">
      {/* Hero Cover Photo */}
      {property?.picture?.regular && (
        <div className="relative h-64 md:h-80 w-full">
          <img
            src={property.picture.regular}
            alt={property.nickname}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

          {/* Header overlay */}
          <header className="absolute top-0 left-0 right-0 z-10">
            <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.png"
                  alt="oAZis Properties"
                  width={40}
                  height={40}
                  className="rounded-full bg-white p-1"
                />
                <h1 className="text-xl font-semibold text-white drop-shadow-lg">Guest Portal</h1>
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-white/90 hover:text-white transition drop-shadow-lg"
              >
                Log out
              </button>
            </div>
          </header>

          {/* Welcome text on cover photo */}
          <div className="absolute bottom-0 left-0 right-0 p-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">
                Welcome to {property.nickname}, {guestFirstName}
              </h2>
              <p className="text-white/90 mt-2 drop-shadow">
                Confirmation: <span className="font-mono">{reservation.confirmationCode}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Fallback header if no cover photo */}
      {!property?.picture?.regular && (
        <header className="bg-oazis-teal text-white">
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
              className="text-sm text-white/80 hover:text-white transition"
            >
              Log out
            </button>
          </div>
          <div className="max-w-4xl mx-auto px-4 pb-6">
            <h2 className="text-3xl font-bold">
              Welcome to {property?.nickname || 'Your Stay'}, {guestFirstName}
            </h2>
            <p className="text-white/80 mt-2">
              Confirmation: <span className="font-mono">{reservation.confirmationCode}</span>
            </p>
          </div>
        </header>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Property Address Card with Map */}
        {property && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-oazis-purple mb-2">
              {property.nickname}
            </h3>
            <p className="text-gray-600 mb-4">{property.address.full}</p>
            {/* Google Maps Embed */}
            <div className="rounded-lg overflow-hidden">
              <iframe
                src={`https://www.google.com/maps?q=${encodeURIComponent(property.address.full)}&output=embed`}
                width="100%"
                height="200"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property Location"
              ></iframe>
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

        {/* House Manual */}
        {houseManualUrl && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-oazis-purple">House Manual</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Everything you need to know about your stay
                </p>
              </div>
              <a
                href={houseManualUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-oazis-teal text-white px-6 py-2 rounded-lg font-medium hover:bg-oazis-teal-dark transition flex items-center gap-2"
              >
                <span>View House Manual</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        )}

        {/* Payment Summary - hide for Airbnb bookings (payments handled through Airbnb) */}
        {!reservation.source?.toLowerCase().includes('airbnb') && (
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
              {/* Next Payment Due */}
              {(() => {
                const scheduledPayments = payments
                  .filter((p): p is Payment & { scheduledDate: string } => p.status === 'scheduled' && !!p.scheduledDate)
                  .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
                const nextPayment = scheduledPayments[0];
                if (nextPayment) {
                  return (
                    <div className="flex justify-between pt-3 border-t border-gray-100">
                      <span className="text-gray-600">Next Payment Due</span>
                      <div className="text-right">
                        <span className="font-medium text-oazis-orange block">
                          {formatCurrency(nextPayment.amount, nextPayment.currency)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(nextPayment.scheduledDate)}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
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
        )}

        {/* Upsells CTA */}
        <div className="bg-oazis-teal rounded-xl p-6 text-white">
          <h3 className="font-semibold text-lg mb-2">Enhance Your Stay</h3>
          <p className="text-white/90 mb-4">
            Add early check-in, late checkout, pool heating, and more.
          </p>
          <Link
            href="/upsells"
            className="inline-block bg-white text-oazis-purple px-6 py-2 rounded-lg font-medium hover:bg-oazis-cream transition"
          >
            Browse Add-ons
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 pb-8 text-center text-sm text-gray-500">
        <p className="mb-2">oAZis Properties &bull; Tucson, AZ</p>
        <p className="space-x-4">
          <a href="mailto:stay@oazisproperties.com" className="hover:text-oazis-purple transition">
            stay@oazisproperties.com
          </a>
          <span>&bull;</span>
          <a href="tel:+15206000434" className="hover:text-oazis-purple transition">
            (520) 600-0434
          </a>
        </p>
      </footer>
    </div>
  );
}
