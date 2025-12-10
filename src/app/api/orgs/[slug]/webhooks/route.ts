import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, webhooks, domains } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

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

// GET /api/orgs/[slug]/webhooks - List all webhooks
export async function GET(request: Request, { params }: RouteParams) {
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

    // Fetch webhooks with domain information
    const webhookList = await db
      .select({
        webhook: webhooks,
        domain: domains,
      })
      .from(webhooks)
      .leftJoin(domains, eq(webhooks.domainFilter, domains.id))
      .where(eq(webhooks.organizationId, membership.organization.id))
      .orderBy(desc(webhooks.createdAt));

    // Format response - exclude secrets from response
    const formatted = webhookList.map(({ webhook, domain }) => ({
      ...webhook,
      secret: webhook.secret ? '********' : null,
      domain: domain
        ? { id: domain.id, domain: domain.domain }
        : null,
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Failed to fetch webhooks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch webhooks' },
      { status: 500 }
    );
  }
}

// POST /api/orgs/[slug]/webhooks - Create a new webhook
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

    // Check if user has admin/owner role
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to create webhooks' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, url, events, severityFilter, domainFilter } = body;

    // Validate required fields
    if (!name || !type || !url || !events) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, url, events' },
        { status: 400 }
      );
    }

    // Validate webhook type
    if (!['slack', 'discord', 'teams', 'custom'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid webhook type. Must be: slack, discord, teams, or custom' },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Validate events is an array
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json(
        { error: 'Events must be a non-empty array' },
        { status: 400 }
      );
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

    // Generate secret for custom webhooks
    const secret =
      type === 'custom'
        ? crypto.randomBytes(32).toString('hex')
        : null;

    // Create webhook
    const [newWebhook] = await db
      .insert(webhooks)
      .values({
        organizationId: membership.organization.id,
        name,
        type,
        url,
        secret,
        events: JSON.stringify(events),
        severityFilter: severityFilter ? JSON.stringify(severityFilter) : null,
        domainFilter: domainFilter || null,
        createdBy: session.user.id,
      })
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'webhook.create',
      entityType: 'webhook',
      entityId: newWebhook.id,
      newValue: { name, type, url: url.substring(0, 50) + '...', events },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Return webhook with actual secret (only time it's shown)
    return NextResponse.json(newWebhook, { status: 201 });
  } catch (error) {
    console.error('Failed to create webhook:', error);
    return NextResponse.json(
      { error: 'Failed to create webhook' },
      { status: 500 }
    );
  }
}
