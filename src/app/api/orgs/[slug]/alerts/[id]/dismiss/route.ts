import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alerts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
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
    const { slug, id } = await params;

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

    // Verify alert belongs to this org
    const [alert] = await db
      .select()
      .from(alerts)
      .where(
        and(
          eq(alerts.id, id),
          eq(alerts.organizationId, membership.organization.id)
        )
      );

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    // Dismiss the alert
    const [dismissedAlert] = await db
      .update(alerts)
      .set({
        isDismissed: true,
        dismissedBy: session.user.id,
        dismissedAt: new Date(),
        isRead: true,
        readBy: session.user.id,
        readAt: alert.readAt || new Date(),
      })
      .where(eq(alerts.id, id))
      .returning();

    return NextResponse.json(dismissedAlert);
  } catch (error) {
    console.error('Failed to dismiss alert:', error);
    return NextResponse.json(
      { error: 'Failed to dismiss alert' },
      { status: 500 }
    );
  }
}
