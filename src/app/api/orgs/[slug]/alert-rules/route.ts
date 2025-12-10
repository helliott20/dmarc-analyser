import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alertRules, domains } from '@/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
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

    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get('domainId');

    // Build where conditions
    const conditions = [eq(alertRules.organizationId, membership.organization.id)];

    if (domainId) {
      // Get rules for specific domain OR org-wide rules
      conditions.push(
        or(
          eq(alertRules.domainId, domainId),
          isNull(alertRules.domainId)
        )!
      );
    }

    // Get alert rules with domain information
    const rulesList = await db
      .select({
        rule: alertRules,
        domain: domains,
      })
      .from(alertRules)
      .leftJoin(domains, eq(alertRules.domainId, domains.id))
      .where(and(...conditions))
      .orderBy(alertRules.createdAt);

    return NextResponse.json(
      rulesList.map((r) => ({
        ...r.rule,
        domain: r.domain,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch alert rules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alert rules' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

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

    const body = await request.json();
    const { domainId, type, threshold, isEnabled, notifyEmail, notifyWebhook } = body;

    if (!type) {
      return NextResponse.json(
        { error: 'Alert type is required' },
        { status: 400 }
      );
    }

    // If domainId provided, verify it belongs to this org
    if (domainId) {
      const [domain] = await db
        .select()
        .from(domains)
        .where(
          and(
            eq(domains.id, domainId),
            eq(domains.organizationId, membership.organization.id)
          )
        );

      if (!domain) {
        return NextResponse.json(
          { error: 'Domain not found' },
          { status: 404 }
        );
      }
    }

    // Create alert rule
    const [newRule] = await db
      .insert(alertRules)
      .values({
        organizationId: membership.organization.id,
        domainId: domainId || null,
        type,
        threshold: threshold || null,
        isEnabled: isEnabled ?? true,
        notifyEmail: notifyEmail ?? true,
        notifyWebhook: notifyWebhook ?? false,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json(newRule);
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to create alert rule' },
      { status: 500 }
    );
  }
}
