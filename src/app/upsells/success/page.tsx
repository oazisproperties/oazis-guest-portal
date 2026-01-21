'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function UpsellSuccessPage() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setLoading(false);
      return;
    }

    // Fetch the checkout session to restore the correct reservation
    fetch(`/api/upsells/session?session_id=${sessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.reservationId) {
          // Restore the correct reservation in localStorage
          const sessionData = localStorage.getItem('guestSession');
          if (sessionData) {
            const session = JSON.parse(sessionData);
            if (session.reservationId !== data.reservationId) {
              // Update to the correct reservation
              session.reservationId = data.reservationId;
              localStorage.setItem('guestSession', JSON.stringify(session));
            }
          } else {
            // No session exists, create one with the reservation ID
            localStorage.setItem(
              'guestSession',
              JSON.stringify({ reservationId: data.reservationId })
            );
          }
        }
      })
      .catch(() => {
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-oazis-cream-light px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="oAZis Properties"
            width={100}
            height={100}
          />
        </div>
        <div className="w-16 h-16 bg-oazis-teal/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-oazis-teal"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-oazis-purple mb-2">
          Request Submitted!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for your request. We&apos;ll review it and be in touch with
          confirmation details shortly.
        </p>
        {loading ? (
          <div className="inline-block bg-gray-300 text-gray-500 px-6 py-3 rounded-lg font-medium">
            Loading...
          </div>
        ) : (
          <Link
            href="/dashboard"
            className="inline-block bg-oazis-purple text-white px-6 py-3 rounded-lg font-medium hover:bg-oazis-purple-dark transition"
          >
            Return to Dashboard
          </Link>
        )}
        {error && (
          <p className="text-sm text-gray-500 mt-4">
            If you have trouble, please log in again with your confirmation code.
          </p>
        )}
      </div>
    </div>
  );
}
