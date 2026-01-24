import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import {
  sendUpsellNotifications,
  sendGuestUpsellConfirmation,
  sendGuestChargeApprovedEmail,
} from '@/lib/notifications';
import { getUpsellById } from '@/lib/upsells';
import { getReservationById, getProperty, addUpsellsToReservationNotes } from '@/lib/guesty';
import {
  storeUpsellRequest,
  findUpsellRequestByPaymentIntent,
  updateUpsellRequestStatus,
  UpsellRequest,
} from '@/lib/upsell-requests';

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

      // Fetch reservation details from Guesty
      let guestName: string | undefined;
      let propertyName: string | undefined;
      let checkInDate: string | undefined;

      if (reservationId && reservationId !== 'Unknown') {
        try {
          const reservation = await getReservationById(reservationId);
          if (reservation) {
            guestName = reservation.guestName;
            checkInDate = reservation.checkIn?.split('T')[0]; // Format as YYYY-MM-DD

            if (reservation.listingId) {
              const property = await getProperty(reservation.listingId);
              propertyName = property?.nickname || property?.title;
            }
          }
        } catch (fetchError) {
          console.error('Error fetching reservation details:', fetchError);
          // Continue with notification even if we can't get details
        }
      }

      const paymentIntentId = typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || 'Unknown';
      const customerEmail = session.customer_details?.email || undefined;

      // Send notifications to admin (email + Slack)
      await sendUpsellNotifications({
        reservationId,
        items,
        totalAmount,
        currency,
        customerEmail,
        paymentIntentId,
        guestName,
        propertyName,
        checkInDate,
      });

      // Store upsell request in Redis
      const upsellRequest: UpsellRequest = {
        id: paymentIntentId,
        reservationId,
        items: cartItems.map((item, index) => ({
          ...item,
          name: items[index].name,
          price: items[index].price,
          currency: items[index].currency,
        })),
        totalAmount,
        currency,
        paymentIntentId,
        customerEmail,
        guestName,
        propertyName,
        checkInDate,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      await storeUpsellRequest(upsellRequest);
      console.log(`Stored upsell request ${paymentIntentId} in Redis`);

      // Add upsells to Guesty reservation notes
      if (reservationId && reservationId !== 'Unknown') {
        await addUpsellsToReservationNotes(reservationId, items, totalAmount, paymentIntentId);
        console.log(`Added upsells to Guesty notes for reservation ${reservationId}`);
      }

      // Send confirmation email to guest
      if (customerEmail && guestName && propertyName && checkInDate) {
        await sendGuestUpsellConfirmation({
          guestEmail: customerEmail,
          guestName,
          propertyName,
          checkInDate,
          items,
          totalAmount,
        });
        console.log(`Sent confirmation email to guest ${customerEmail}`);
      }

      console.log(`Notifications sent for reservation ${reservationId}`);
    } catch (error) {
      console.error('Error processing checkout session:', error);
      // Still return 200 to acknowledge receipt
    }
  }

  // Handle charge captured (payment approved)
  if (event.type === 'charge.captured') {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId = typeof charge.payment_intent === 'string'
      ? charge.payment_intent
      : charge.payment_intent?.id;

    if (!paymentIntentId) {
      console.log('Charge captured without payment intent, ignoring');
      return NextResponse.json({ received: true });
    }

    try {
      // Find the upsell request by payment intent
      const upsellRequest = await findUpsellRequestByPaymentIntent(paymentIntentId);

      if (!upsellRequest) {
        console.log(`No upsell request found for payment intent ${paymentIntentId}`);
        return NextResponse.json({ received: true });
      }

      // Update status to approved
      await updateUpsellRequestStatus(upsellRequest.id, 'approved', new Date().toISOString());
      console.log(`Updated upsell request ${upsellRequest.id} to approved`);

      // Send confirmation email to guest
      if (upsellRequest.customerEmail && upsellRequest.guestName && upsellRequest.propertyName && upsellRequest.checkInDate) {
        await sendGuestChargeApprovedEmail({
          guestEmail: upsellRequest.customerEmail,
          guestName: upsellRequest.guestName,
          propertyName: upsellRequest.propertyName,
          checkInDate: upsellRequest.checkInDate,
          items: upsellRequest.items,
          totalAmount: upsellRequest.totalAmount,
        });
        console.log(`Sent charge approved email to guest ${upsellRequest.customerEmail}`);
      }
    } catch (error) {
      console.error('Error processing charge captured:', error);
    }
  }

  return NextResponse.json({ received: true });
}
