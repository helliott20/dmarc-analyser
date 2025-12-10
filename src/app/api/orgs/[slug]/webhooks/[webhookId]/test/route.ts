import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, webhooks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { testWebhook } from '@/lib/webhooks';

interface RouteParams {
  params: Promise<{ slug: string; webhookId: string }>;
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

// POST /api/orgs/[slug]/webhooks/[webhookId]/test - Test a webhook
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, webhookId } = await params;

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

    // Check if user has admin/owner role
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to test webhooks' },
        { status: 403 }
      );
    }

    // Verify webhook belongs to this org
    const [webhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, membership.organization.id)
        )
      );

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Send test webhook
    const result = await testWebhook(
      webhook.type as 'slack' | 'discord' | 'teams' | 'custom',
      webhook.url,
      webhook.secret || undefined
    );

    if (!result.success) {
      // Increment failure count
      await db
        .update(webhooks)
        .set({
          failureCount: webhook.failureCount + 1,
        })
        .where(eq(webhooks.id, webhookId));

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 400 }
      );
    }

    // Update lastTriggeredAt on success
    await db
      .update(webhooks)
      .set({
        lastTriggeredAt: new Date(),
        failureCount: 0, // Reset failure count on success
      })
      .where(eq(webhooks.id, webhookId));

    return NextResponse.json({
      success: true,
      message: 'Test webhook sent successfully',
    });
  } catch (error) {
    console.error('Failed to test webhook:', error);
    return NextResponse.json(
      { error: 'Failed to test webhook' },
      { status: 500 }
    );
  }
}
