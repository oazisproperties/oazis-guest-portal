import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { sendUpsellNotifications } from '@/lib/notifications';
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
  const stripe = getStripe();
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    console.error('No Stripe signature found');
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Webhook signature verification failed:', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Only process upsell checkouts (those with our metadata)
    if (!session.metadata?.items) {
      console.log('Checkout session without upsell metadata, ignoring');
      return NextResponse.json({ received: true });
    }

    try {
      const reservationId = session.metadata.reservationId || 'Unknown';
      let cartItems: Array<{ upsellId: string; optionId?: string }>;
      try {
        cartItems = JSON.parse(session.metadata.items);
      } catch (parseError) {
        console.error('Failed to parse cart items metadata:', parseError);
        return NextResponse.json({ received: true, error: 'Invalid metadata format' });
      }

      // Build the items list with names and prices
      const items = cartItems.map(item => {
        const upsell = getUpsellById(item.upsellId);
        if (!upsell) {
          return { name: 'Unknown Item', price: 0, currency: 'USD' };
        }

        let price = upsell.price;
        let name = upsell.name;

        if (item.optionId && upsell.options) {
          const option = upsell.options.find(o => o.id === item.optionId);
          if (option) {
            price = option.price;
            name = `${upsell.name} - ${option.label}`;
          }
        }

        return { name, price, currency: upsell.currency };
      });

      const totalAmount = (session.amount_total || 0) / 100;
      const currency = session.currency || 'usd';

      await sendUpsellNotifications({
        reservationId,
        items,
        totalAmount,
        currency,
        customerEmail: session.customer_details?.email || undefined,
        paymentIntentId: typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || 'Unknown',
      });

      console.log(`Notifications sent for reservation ${reservationId}`);
    } catch (error) {
      console.error('Error processing checkout session:', error);
      // Still return 200 to acknowledge receipt
    }
  }

  return NextResponse.json({ received: true });
}
