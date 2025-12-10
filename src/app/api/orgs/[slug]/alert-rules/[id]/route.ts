import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alertRules } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; id: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string, requiredRole?: string[]) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  if (!membership) {
    return null;
  }

  if (requiredRole && !requiredRole.includes(membership.role)) {
    return null;
  }

  return membership;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify rule belongs to this org
    const [rule] = await db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.id, id),
          eq(alertRules.organizationId, membership.organization.id)
        )
      );

    if (!rule) {
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
    }

    const body = await request.json();
    const { threshold, isEnabled, notifyEmail, notifyWebhook } = body;

    // Update rule
    const [updatedRule] = await db
      .update(alertRules)
      .set({
        threshold: threshold !== undefined ? threshold : rule.threshold,
        isEnabled: isEnabled !== undefined ? isEnabled : rule.isEnabled,
        notifyEmail: notifyEmail !== undefined ? notifyEmail : rule.notifyEmail,
        notifyWebhook: notifyWebhook !== undefined ? notifyWebhook : rule.notifyWebhook,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, id))
      .returning();

    return NextResponse.json(updatedRule);
  } catch (error) {
    console.error('Failed to update alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify rule belongs to this org
    const [rule] = await db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.id, id),
          eq(alertRules.organizationId, membership.organization.id)
        )
      );

    if (!rule) {
      return NextResponse.json({ error: 'Alert rule not found' }, { status: 404 });
    }

    // Delete the rule
    await db.delete(alertRules).where(eq(alertRules.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert rule' },
      { status: 500 }
    );
  }
}
