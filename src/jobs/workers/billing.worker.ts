import { Job } from 'bullmq';
import { isSaasMode } from '@/lib/config';
import { getStripe } from '@/lib/stripe';
import {
  getOrgsWithActiveSubscriptions,
  getDomainCount,
} from '@/lib/billing';
import { db } from '@/db';
import { organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export interface BillingJobData {
  type: 'report_usage' | 'check_trials';
}

/**
 * Process billing jobs
 */
export async function processBillingJob(job: Job<BillingJobData>) {
  // Skip if not in SaaS mode
  if (!isSaasMode()) {
    console.log('Billing job skipped - not in SaaS mode');
    return { skipped: true };
  }

  const { type } = job.data;

  switch (type) {
    case 'report_usage':
      return await reportUsageToStripe();
    case 'check_trials':
      return await checkExpiringTrials();
    default:
      console.warn(`Unknown billing job type: ${type}`);
      return { error: 'Unknown job type' };
  }
}

/**
 * Report domain usage to Stripe for metered billing
 * Should run daily
 */
async function reportUsageToStripe() {
  console.log('Starting usage reporting to Stripe...');

  const stripe = getStripe();
  const orgsWithSubscriptions = await getOrgsWithActiveSubscriptions();

  let reported = 0;
  let errors = 0;

  for (const org of orgsWithSubscriptions) {
    try {
      // Get current domain count
      const domainCount = await getDomainCount(org.id);

      // Get the subscription to find the metered item
      const subscription = await stripe.subscriptions.retrieve(
        org.stripeSubscriptionId,
        { expand: ['items.data'] }
      );

      // Find the metered subscription item (domain pricing)
      const meteredItem = subscription.items.data.find(
        (item) => item.price.recurring?.usage_type === 'metered'
      );

      if (!meteredItem) {
        console.warn(
          `No metered item found for org ${org.id}, subscription ${org.stripeSubscriptionId}`
        );
        continue;
      }

      // Report usage using the subscription items API
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (stripe.subscriptionItems as any).createUsageRecord(meteredItem.id, {
        quantity: domainCount,
        timestamp: Math.floor(Date.now() / 1000),
        action: 'set', // Replace previous usage for this period
      });

      reported++;
      console.log(`Reported ${domainCount} domains for org ${org.id}`);
    } catch (error) {
      errors++;
      console.error(`Failed to report usage for org ${org.id}:`, error);
    }
  }

  console.log(
    `Usage reporting complete: ${reported} reported, ${errors} errors`
  );

  return { reported, errors };
}

/**
 * Check for trials expiring soon and send reminders
 * Should run daily
 */
async function checkExpiringTrials() {
  console.log('Checking for expiring trials...');

  const now = new Date();
  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  // Find orgs with trials expiring in the next 3 days
  const trialingOrgs = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      billingEmail: organizations.billingEmail,
      trialEndsAt: organizations.trialEndsAt,
    })
    .from(organizations)
    .where(eq(organizations.subscriptionStatus, 'trialing'));

  let expiringSoon = 0;

  for (const org of trialingOrgs) {
    if (!org.trialEndsAt) continue;

    const daysRemaining = Math.ceil(
      (org.trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Send reminder at 3 days, 1 day, and day of expiration
    if (daysRemaining <= 3 && daysRemaining >= 0) {
      expiringSoon++;
      console.log(
        `Trial expiring soon for org ${org.slug}: ${daysRemaining} days remaining`
      );

      // TODO: Send email reminder
      // await sendTrialExpirationReminder(org.billingEmail, org.name, daysRemaining);
    }
  }

  console.log(`Found ${expiringSoon} trials expiring within 3 days`);

  return { expiringSoon };
}
