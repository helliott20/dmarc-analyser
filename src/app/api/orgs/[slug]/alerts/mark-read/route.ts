import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alerts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

    const body = await request.json();
    const { domainId } = body;

    // Build conditions for the update
    const conditions = [
      eq(alerts.organizationId, membership.organization.id),
      eq(alerts.isRead, false),
    ];

    // If domainId is specified, only mark alerts for that domain
    // If domainId is null, mark org-wide alerts (no domain)
    // If domainId is undefined, mark all alerts
    if (domainId !== undefined) {
      if (domainId === null) {
        // Only mark alerts with no domain (org-wide)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        conditions.push(eq(alerts.domainId, null as any));
      } else {
        // Only mark alerts for specific domain
        conditions.push(eq(alerts.domainId, domainId));
      }
    }

    await db
      .update(alerts)
      .set({ isRead: true })
      .where(and(...conditions));

    return NextResponse.json({
      success: true,
      message: domainId
        ? 'Marked alerts as read for domain'
        : 'Marked all alerts as read',
    });
  } catch (error) {
    console.error('Failed to mark alerts as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark alerts as read' },
      { status: 500 }
    );
  }
}
