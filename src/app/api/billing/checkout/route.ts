import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';
import { getStripe, STRIPE_PRICES, hasStripePrices } from '@/lib/stripe';
import { isSaasMode } from '@/lib/config';

/**
 * POST /api/billing/checkout
 * Create a Stripe checkout session for subscribing
 */
export async function POST(request: NextRequest) {
  try {
    // Check if SaaS mode is enabled
    if (!isSaasMode()) {
      return NextResponse.json(
        { error: 'Billing is not enabled in self-hosted mode' },
        { status: 400 }
      );
    }

    // Check if Stripe prices are configured
    if (!hasStripePrices()) {
      return NextResponse.json(
        { error: 'Stripe prices are not configured' },
        { status: 500 }
      );
    }

    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orgSlug } = await request.json();

    if (!orgSlug) {
      return NextResponse.json(
        { error: 'Organization slug is required' },
        { status: 400 }
      );
    }

    // Get organization and verify user has access (owner/admin only)
    const [result] = await db
      .select({
        org: organizations,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(organizations.slug, orgSlug),
          eq(orgMembers.userId, session.user.id)
        )
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    if (!['owner', 'admin'].includes(result.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can manage billing' },
        { status: 403 }
      );
    }

    const { org } = result;
    const stripe = getStripe();
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Get current domain count for the organization
    const [domainCountResult] = await db
      .select({ count: count() })
      .from(domains)
      .where(eq(domains.organizationId, org.id));
    const domainCount = Math.max(1, domainCountResult?.count || 1); // Minimum 1 domain

    // Create or reuse Stripe customer
    let customerId = org.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.billingEmail || session.user.email || undefined,
        name: org.name,
        metadata: {
          organizationId: org.id,
          organizationSlug: org.slug,
        },
      });
      customerId = customer.id;

      // Save customer ID to database
      await db
        .update(organizations)
        .set({
          stripeCustomerId: customerId,
          updatedAt: new Date(),
        })
        .where(eq(organizations.id, org.id));
    }

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: STRIPE_PRICES.base,
          quantity: 1,
        },
        {
          price: STRIPE_PRICES.domain,
          quantity: domainCount,
        },
      ],
      subscription_data: {
        metadata: {
          organizationId: org.id,
          organizationSlug: org.slug,
        },
      },
      success_url: `${baseUrl}/orgs/${org.slug}/settings/billing?success=true`,
      cancel_url: `${baseUrl}/orgs/${org.slug}/settings/billing?canceled=true`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
