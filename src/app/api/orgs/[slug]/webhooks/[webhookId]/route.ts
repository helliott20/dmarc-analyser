import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, webhooks, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

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

// GET /api/orgs/[slug]/webhooks/[webhookId] - Get a specific webhook
export async function GET(request: Request, { params }: RouteParams) {
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

    // Fetch webhook with domain information
    const [result] = await db
      .select({
        webhook: webhooks,
        domain: domains,
      })
      .from(webhooks)
      .leftJoin(domains, eq(webhooks.domainFilter, domains.id))
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, membership.organization.id)
        )
      );

    if (!result) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Format response - exclude secret
    const formatted = {
      ...result.webhook,
      secret: result.webhook.secret ? '********' : null,
      domain: result.domain
        ? { id: result.domain.id, domain: result.domain.domain }
        : null,
    };

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch webhook:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhook' },
      { status: 500 }
    );
  }
}

// PATCH /api/orgs/[slug]/webhooks/[webhookId] - Update a webhook
export async function PATCH(request: Request, { params }: RouteParams) {
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
        { error: 'You do not have permission to update webhooks' },
        { status: 403 }
      );
    }

    // Verify webhook belongs to this org
    const [existingWebhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, membership.organization.id)
        )
      );

    if (!existingWebhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, url, events, severityFilter, domainFilter, isActive } = body;

    // Validate URL format if provided
    if (url) {
      try {
        new URL(url);
      } catch {
        return NextResponse.json(
          { error: 'Invalid URL format' },
          { status: 400 }
        );
      }
    }

    // Validate events if provided
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return NextResponse.json(
          { error: 'Events must be a non-empty array' },
          { status: 400 }
        );
      }
    }

    // If domainFilter is provided, verify it exists and belongs to this org
    if (domainFilter) {
      const [domain] = await db
        .select()
        .from(domains)
        .where(
          and(
            eq(domains.id, domainFilter),
            eq(domains.organizationId, membership.organization.id)
          )
        );

      if (!domain) {
        return NextResponse.json(
          { error: 'Domain not found or does not belong to this organization' },
          { status: 404 }
        );
      }
    }

    // Build update object
    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (url !== undefined) updates.url = url;
    if (events !== undefined) updates.events = JSON.stringify(events);
    if (severityFilter !== undefined)
      updates.severityFilter = severityFilter ? JSON.stringify(severityFilter) : null;
    if (domainFilter !== undefined) updates.domainFilter = domainFilter || null;
    if (isActive !== undefined) updates.isActive = isActive;

    // Update webhook
    const [updatedWebhook] = await db
      .update(webhooks)
      .set(updates)
      .where(eq(webhooks.id, webhookId))
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'webhook.update',
      entityType: 'webhook',
      entityId: webhookId,
      oldValue: { name: existingWebhook.name },
      newValue: updates,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Return updated webhook with masked secret
    return NextResponse.json({
      ...updatedWebhook,
      secret: updatedWebhook.secret ? '********' : null,
    });
  } catch (error) {
    console.error('Failed to update webhook:', error);
    return NextResponse.json(
      { error: 'Failed to update webhook' },
      { status: 500 }
    );
  }
}

// DELETE /api/orgs/[slug]/webhooks/[webhookId] - Delete a webhook
export async function DELETE(request: Request, { params }: RouteParams) {
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
        { error: 'You do not have permission to delete webhooks' },
        { status: 403 }
      );
    }

    // Verify webhook belongs to this org
    const [existingWebhook] = await db
      .select()
      .from(webhooks)
      .where(
        and(
          eq(webhooks.id, webhookId),
          eq(webhooks.organizationId, membership.organization.id)
        )
      );

    if (!existingWebhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Delete webhook
    await db.delete(webhooks).where(eq(webhooks.id, webhookId));

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'webhook.delete',
      entityType: 'webhook',
      entityId: webhookId,
      oldValue: { name: existingWebhook.name, type: existingWebhook.type },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete webhook:', error);
    return NextResponse.json(
      { error: 'Failed to delete webhook' },
      { status: 500 }
    );
  }
}
