'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function UpsellSuccessPage() {
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
          Purchase Successful!
        </h1>
        <p className="text-gray-600 mb-8">
          Thank you for your purchase. We&apos;ll be in touch with confirmation details
          shortly.
        </p>
        <Link
          href="/dashboard"
          className="inline-block bg-oazis-purple text-white px-6 py-3 rounded-lg font-medium hover:bg-oazis-purple-dark transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
