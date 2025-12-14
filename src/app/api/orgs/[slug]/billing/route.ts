import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getBillingInfo } from '@/lib/billing';
import { isSaasMode } from '@/lib/config';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

/**
 * GET /api/orgs/[slug]/billing
 * Get billing information for an organization
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug } = await params;

    // Get organization and verify user has access
    const [result] = await db
      .select({
        org: organizations,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(organizations.slug, slug),
          eq(orgMembers.userId, session.user.id)
        )
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Return minimal info for non-owner/admin
    const canManageBilling = ['owner', 'admin'].includes(result.role);

    // If not in SaaS mode, return self-hosted status
    if (!isSaasMode()) {
      return NextResponse.json({
        mode: 'self-hosted',
        canManageBilling,
      });
    }

    // Get full billing info
    const billingInfo = await getBillingInfo(result.org.id);

    if (!billingInfo) {
      return NextResponse.json(
        { error: 'Failed to get billing info' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      mode: 'saas',
      canManageBilling,
      ...billingInfo,
    });
  } catch (error) {
    console.error('Failed to get billing info:', error);
    return NextResponse.json(
      { error: 'Failed to get billing info' },
      { status: 500 }
    );
  }
}
