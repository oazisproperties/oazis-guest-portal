'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

function LoginForm() {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Pre-populate code from URL parameter
  useEffect(() => {
    const codeParam = searchParams.get('code');
    if (codeParam) {
      setConfirmationCode(codeParam.toUpperCase());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmationCode: confirmationCode.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid confirmation code');
        return;
      }

      // Store session in localStorage
      localStorage.setItem('guestSession', JSON.stringify(data.session));
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-oazis-cream-light px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Image
              src="/logo.png"
              alt="oAZis Properties"
              width={150}
              height={150}
              priority
            />
          </div>

          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-oazis-purple">Welcome to Your Stay</h1>
            <p className="text-gray-600 mt-2">
              Enter your reservation code to access your stay details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="confirmationCode"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirmation Code
              </label>
              <input
                id="confirmationCode"
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                placeholder="e.g., GY-ABC123"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-oazis-teal focus:border-transparent outline-none transition text-gray-900 uppercase"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !confirmationCode.trim()}
              className="w-full bg-oazis-teal text-white py-3 px-4 rounded-lg font-medium hover:bg-oazis-teal-dark transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'View My Reservation'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Your confirmation code can be found in your booking confirmation email.
          </p>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-oazis-purple">
          oAZis Properties &bull; Tucson, AZ
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-oazis-cream-light">
        <div className="text-oazis-purple">Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
