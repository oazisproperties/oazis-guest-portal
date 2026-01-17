'use client';

import Link from 'next/link';

export default function UpsellSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-8 h-8 text-green-600"
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Purchase Successful!
        </h1>
        <p className="text-slate-600 mb-8">
          Thank you for your purchase. We&apos;ll be in touch with confirmation details
          shortly.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-slate-900 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-800 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
