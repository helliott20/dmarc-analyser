import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkBillingAccess } from '@/lib/billing';
import { isSaasMode } from '@/lib/config';
import { TrialBanner } from '@/components/billing/trial-banner';
import { BillingGuard } from '@/components/billing/billing-guard';

interface OrgLayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

async function getOrgMembership(userId: string, slug: string) {
  const [membership] = await db
    .select({
      orgId: organizations.id,
      orgSlug: organizations.slug,
      subscriptionStatus: organizations.subscriptionStatus,
      trialEndsAt: organizations.trialEndsAt,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(
      and(
        eq(orgMembers.userId, userId),
        eq(organizations.slug, slug)
      )
    );

  return membership;
}

export default async function OrgLayout({ children, params }: OrgLayoutProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const membership = await getOrgMembership(session.user.id, slug);

  if (!membership) {
    redirect('/orgs');
  }

  // Check billing access in SaaS mode
  if (isSaasMode()) {
    const billingAccess = await checkBillingAccess(membership.orgId);

    if (!billingAccess.allowed) {
      // Get current path to check if we're already on billing page
      const headersList = await headers();
      const pathname = headersList.get('x-pathname') || '';
      const isBillingPage = pathname.includes('/settings/billing');

      // Allow access to billing page even if trial expired
      if (!isBillingPage) {
        redirect(`/orgs/${slug}/settings/billing?reason=${billingAccess.reason}`);
      }
    }
  }

  const saasMode = isSaasMode();

  return (
    <>
      {saasMode && (
        <TrialBanner
          orgSlug={slug}
          trialEndsAt={membership.trialEndsAt?.toISOString() || null}
          status={membership.subscriptionStatus || 'trialing'}
        />
      )}
      {saasMode ? (
        <BillingGuard orgSlug={slug}>{children}</BillingGuard>
      ) : (
        children
      )}
    </>
  );
}
