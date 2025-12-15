import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkBillingAccess } from '@/lib/billing';
import { isSaasMode } from '@/lib/config';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/orgs/[slug]/billing/access
 * Check if the current user has billing access to the org
 * Used by client-side BillingGuard for navigation checks
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    // Self-hosted mode = always allowed
    if (!isSaasMode()) {
      return NextResponse.json({ allowed: true });
    }

    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ allowed: false, reason: 'unauthenticated' });
    }

    // Get org membership
    const [membership] = await db
      .select({
        orgId: organizations.id,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
      .where(
        and(
          eq(orgMembers.userId, session.user.id),
          eq(organizations.slug, slug)
        )
      );

    if (!membership) {
      return NextResponse.json({ allowed: false, reason: 'no_access' });
    }

    const billingAccess = await checkBillingAccess(membership.orgId);

    return NextResponse.json({
      allowed: billingAccess.allowed,
      reason: billingAccess.reason || null,
      status: billingAccess.status,
    });
  } catch (error) {
    console.error('Billing access check error:', error);
    return NextResponse.json(
      { allowed: true }, // Fail open to avoid blocking legitimate users
      { status: 200 }
    );
  }
}
