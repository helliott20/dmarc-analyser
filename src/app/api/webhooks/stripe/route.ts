import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { isSaasMode } from '@/lib/config';
import {
  setStripeIds,
  updateSubscriptionStatus,
  getOrgByStripeCustomerId,
  getOrgByStripeSubscriptionId,
} from '@/lib/billing';

/**
 * POST /api/webhooks/stripe
 * Handle Stripe webhook events
 */
export async function POST(request: NextRequest) {
  try {
    // Check if SaaS mode is enabled
    if (!isSaasMode()) {
      return NextResponse.json(
        { error: 'Webhooks not enabled in self-hosted mode' },
        { status: 400 }
      );
    }

    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'No signature provided' },
        { status: 400 }
      );
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    const stripe = getStripe();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}

/**
 * Handle checkout.session.completed
 * Customer has completed checkout and subscribed
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription ID in checkout session');
    return;
  }

  // Find organization by customer ID
  const org = await getOrgByStripeCustomerId(customerId);
  if (!org) {
    console.error(`No organization found for Stripe customer: ${customerId}`);
    return;
  }

  // Update organization with subscription ID and set status to active
  await setStripeIds(org.id, customerId, subscriptionId);
  console.log(`Subscription activated for org ${org.slug}`);
}

/**
 * Handle customer.subscription.updated
 * Subscription status has changed (e.g., renewed, payment method updated)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const org = await getOrgByStripeSubscriptionId(subscription.id);
  if (!org) {
    console.error(`No organization found for subscription: ${subscription.id}`);
    return;
  }

  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    trialing: 'trialing',
    incomplete: 'unpaid',
    incomplete_expired: 'canceled',
    paused: 'canceled',
  };

  const newStatus = statusMap[subscription.status] || 'active';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const periodEnd = new Date((subscription as any).current_period_end * 1000);

  await updateSubscriptionStatus(
    org.id,
    newStatus as 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing',
    periodEnd
  );

  console.log(`Subscription updated for org ${org.slug}: ${newStatus}`);
}

/**
 * Handle customer.subscription.deleted
 * Subscription has been canceled and ended
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const org = await getOrgByStripeSubscriptionId(subscription.id);
  if (!org) {
    console.error(`No organization found for subscription: ${subscription.id}`);
    return;
  }

  await updateSubscriptionStatus(org.id, 'canceled');
  console.log(`Subscription canceled for org ${org.slug}`);
}

/**
 * Handle invoice.payment_failed
 * A payment attempt failed
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const org = await getOrgByStripeCustomerId(customerId);
  if (!org) {
    console.error(`No organization found for customer: ${customerId}`);
    return;
  }

  // Mark as past_due - Stripe will retry
  await updateSubscriptionStatus(org.id, 'past_due');
  console.log(`Payment failed for org ${org.slug}, marked as past_due`);

  // TODO: Send email notification to billing email
}

/**
 * Handle invoice.payment_succeeded
 * A payment was successful (renewal or recovery)
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;
  if (!customerId) return;

  const org = await getOrgByStripeCustomerId(customerId);
  if (!org) return;

  // If they were past_due, payment succeeded - set back to active
  await updateSubscriptionStatus(org.id, 'active');
  console.log(`Payment succeeded for org ${org.slug}`);
}
