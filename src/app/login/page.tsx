'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Welcome</h1>
            <p className="text-slate-600 mt-2">
              Enter your reservation code to access your stay details
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="confirmationCode"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Confirmation Code
              </label>
              <input
                id="confirmationCode"
                type="text"
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value.toUpperCase())}
                placeholder="e.g., ABC123"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition text-slate-900 uppercase"
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
              className="w-full bg-slate-900 text-white py-3 px-4 rounded-lg font-medium hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'View My Reservation'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Your confirmation code can be found in your booking confirmation email.
          </p>
        </div>
      </div>
    </div>
  );
}
