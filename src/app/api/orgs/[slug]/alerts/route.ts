import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, alerts, domains } from '@/db/schema';
import { eq, and, desc, or, isNull, count } from 'drizzle-orm';

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
    const type = searchParams.get('type');
    const severity = searchParams.get('severity');
    const readStatus = searchParams.get('read');
    const dismissedStatus = searchParams.get('dismissed');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [eq(alerts.organizationId, membership.organization.id)];

    if (type) {
      conditions.push(eq(alerts.type, type as any));
    }

    if (severity) {
      conditions.push(eq(alerts.severity, severity as any));
    }

    if (readStatus !== null && readStatus !== undefined) {
      conditions.push(eq(alerts.isRead, readStatus === 'true'));
    }

    if (dismissedStatus !== null && dismissedStatus !== undefined) {
      conditions.push(eq(alerts.isDismissed, dismissedStatus === 'true'));
    }

    // Get alerts with domain information
    const alertsList = await db
      .select({
        alert: alerts,
        domain: domains,
      })
      .from(alerts)
      .leftJoin(domains, eq(alerts.domainId, domains.id))
      .where(and(...conditions))
      .orderBy(desc(alerts.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count
    const [totalCount] = await db
      .select({ count: count() })
      .from(alerts)
      .where(and(...conditions));

    // Get unread count
    const [unreadCount] = await db
      .select({ count: count() })
      .from(alerts)
      .where(
        and(
          eq(alerts.organizationId, membership.organization.id),
          eq(alerts.isRead, false),
          eq(alerts.isDismissed, false)
        )
      );

    return NextResponse.json({
      alerts: alertsList.map((a) => ({
        ...a.alert,
        domain: a.domain,
      })),
      pagination: {
        page,
        limit,
        total: totalCount?.count || 0,
        pages: Math.ceil((totalCount?.count || 0) / limit),
      },
      unreadCount: unreadCount?.count || 0,
    });
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}
