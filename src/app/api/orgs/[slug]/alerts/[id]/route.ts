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

export async function PATCH(request: Request, { params }: RouteParams) {
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

    const body = await request.json();
    const { isRead } = body;

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

    // Update alert
    const [updatedAlert] = await db
      .update(alerts)
      .set({
        isRead: isRead ?? alert.isRead,
        readBy: isRead ? session.user.id : alert.readBy,
        readAt: isRead ? new Date() : alert.readAt,
      })
      .where(eq(alerts.id, id))
      .returning();

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}
