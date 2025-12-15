import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alerts } from '@/db/schema';
import { eq, and, count } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return membership;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Only owners and admins can bulk delete
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can bulk delete alerts' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, domainId } = body;

    // Build conditions for the delete
    const conditions = [eq(alerts.organizationId, membership.organization.id)];

    // Filter by alert type if specified
    if (type) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      conditions.push(eq(alerts.type, type as any));
    }

    // Filter by domain if specified
    if (domainId) {
      conditions.push(eq(alerts.domainId, domainId));
    }

    // Get count before delete
    const [beforeCount] = await db
      .select({ count: count() })
      .from(alerts)
      .where(and(...conditions));

    // Delete the alerts
    await db.delete(alerts).where(and(...conditions));

    return NextResponse.json({
      success: true,
      deletedCount: beforeCount?.count || 0,
      message: `Deleted ${beforeCount?.count || 0} alerts`,
    });
  } catch (error) {
    console.error('Failed to bulk delete alerts:', error);
    return NextResponse.json(
      { error: 'Failed to bulk delete alerts' },
      { status: 500 }
    );
  }
}
