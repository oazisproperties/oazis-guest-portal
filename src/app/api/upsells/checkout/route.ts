import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUpsellById } from '@/lib/upsells';

function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, reservationId } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided' },
        { status: 400 }
      );
    }

    // Build line items for Stripe
    const lineItems = items
      .map((itemId: string) => {
        const upsell = getUpsellById(itemId);
        if (!upsell) return null;

        return {
          price_data: {
            currency: upsell.currency.toLowerCase(),
            product_data: {
              name: upsell.name,
              description: upsell.description,
            },
            unit_amount: Math.round(upsell.price * 100), // Stripe uses cents
          },
          quantity: 1,
        };
      })
      .filter(Boolean);

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'No valid items found' },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Stripe Checkout Session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${appUrl}/upsells/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/upsells`,
      metadata: {
        reservationId: reservationId || '',
        items: items.join(','),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
