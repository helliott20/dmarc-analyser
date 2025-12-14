import { db } from '@/db';
import { organizations, domains } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { isSaasMode, PRICING } from './config';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export interface BillingAccess {
  allowed: boolean;
  reason?: 'trial_expired' | 'subscription_canceled' | 'payment_failed';
  status: SubscriptionStatus;
  trialEndsAt?: Date | null;
  currentPeriodEnd?: Date | null;
}

export interface BillingInfo {
  status: SubscriptionStatus;
  trialEndsAt: Date | null;
  currentPeriodEnd: Date | null;
  domainCount: number;
  monthlyPrice: number;
  hasStripeSubscription: boolean;
  stripeCustomerId: string | null;
}

/**
 * Check if a user/org has billing access (can use the app)
 * Self-hosted mode: Always allowed
 * SaaS mode: Check trial/subscription status
 */
export async function checkBillingAccess(orgId: string): Promise<BillingAccess> {
  // Self-hosted mode = always allowed
  if (!isSaasMode()) {
    return { allowed: true, status: 'active' };
  }

  const [org] = await db
    .select({
      subscriptionStatus: organizations.subscriptionStatus,
      trialEndsAt: organizations.trialEndsAt,
      currentPeriodEnd: organizations.currentPeriodEnd,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    return { allowed: false, reason: 'subscription_canceled', status: 'canceled' };
  }

  const status = (org.subscriptionStatus || 'trialing') as SubscriptionStatus;

  // Trialing - check if trial has expired
  if (status === 'trialing') {
    if (org.trialEndsAt && org.trialEndsAt < new Date()) {
      return {
        allowed: false,
        reason: 'trial_expired',
        status,
        trialEndsAt: org.trialEndsAt,
      };
    }
    return {
      allowed: true,
      status,
      trialEndsAt: org.trialEndsAt,
    };
  }

  // Active or past_due - allow with grace period
  if (['active', 'past_due'].includes(status)) {
    return {
      allowed: true,
      status,
      currentPeriodEnd: org.currentPeriodEnd,
    };
  }

  // Canceled or unpaid - not allowed
  return {
    allowed: false,
    reason: status === 'unpaid' ? 'payment_failed' : 'subscription_canceled',
    status,
  };
}

/**
 * Get billing information for an organization
 */
export async function getBillingInfo(orgId: string): Promise<BillingInfo | null> {
  const [org] = await db
    .select({
      subscriptionStatus: organizations.subscriptionStatus,
      trialEndsAt: organizations.trialEndsAt,
      currentPeriodEnd: organizations.currentPeriodEnd,
      stripeCustomerId: organizations.stripeCustomerId,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) return null;

  // Count domains
  const [domainResult] = await db
    .select({ count: count() })
    .from(domains)
    .where(eq(domains.organizationId, orgId));

  const domainCount = domainResult?.count || 0;
  const monthlyPrice = PRICING.baseFee + PRICING.perDomain * domainCount;

  return {
    status: (org.subscriptionStatus || 'trialing') as SubscriptionStatus,
    trialEndsAt: org.trialEndsAt,
    currentPeriodEnd: org.currentPeriodEnd,
    domainCount,
    monthlyPrice,
    hasStripeSubscription: Boolean(org.stripeSubscriptionId),
    stripeCustomerId: org.stripeCustomerId,
  };
}

/**
 * Calculate days remaining in trial
 */
export function getTrialDaysRemaining(trialEndsAt: Date | null): number {
  if (!trialEndsAt) return 0;
  const now = new Date();
  const diff = trialEndsAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if trial is expiring soon (within 7 days)
 */
export function isTrialExpiringSoon(trialEndsAt: Date | null): boolean {
  const daysRemaining = getTrialDaysRemaining(trialEndsAt);
  return daysRemaining > 0 && daysRemaining <= 7;
}

/**
 * Update organization subscription status
 */
export async function updateSubscriptionStatus(
  orgId: string,
  status: SubscriptionStatus,
  currentPeriodEnd?: Date
): Promise<void> {
  await db
    .update(organizations)
    .set({
      subscriptionStatus: status,
      currentPeriodEnd: currentPeriodEnd || null,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
}

/**
 * Set Stripe customer and subscription IDs
 */
export async function setStripeIds(
  orgId: string,
  customerId: string,
  subscriptionId: string
): Promise<void> {
  await db
    .update(organizations)
    .set({
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, orgId));
}

/**
 * Get organization by Stripe customer ID
 */
export async function getOrgByStripeCustomerId(
  customerId: string
): Promise<{ id: string; slug: string } | null> {
  const [org] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.stripeCustomerId, customerId));

  return org || null;
}

/**
 * Get organization by Stripe subscription ID
 */
export async function getOrgByStripeSubscriptionId(
  subscriptionId: string
): Promise<{ id: string; slug: string } | null> {
  const [org] = await db
    .select({
      id: organizations.id,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.stripeSubscriptionId, subscriptionId));

  return org || null;
}

/**
 * Get domain count for an organization
 */
export async function getDomainCount(orgId: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(domains)
    .where(eq(domains.organizationId, orgId));

  return result?.count || 0;
}

/**
 * Get all organizations with active Stripe subscriptions (for usage reporting)
 */
export async function getOrgsWithActiveSubscriptions(): Promise<
  Array<{ id: string; stripeSubscriptionId: string }>
> {
  return db
    .select({
      id: organizations.id,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
    })
    .from(organizations)
    .where(eq(organizations.subscriptionStatus, 'active'))
    .then((orgs) =>
      orgs.filter((o): o is { id: string; stripeSubscriptionId: string } =>
        Boolean(o.stripeSubscriptionId)
      )
    );
}
