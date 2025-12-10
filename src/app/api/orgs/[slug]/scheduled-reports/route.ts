import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, scheduledReports, domains } from '@/db/schema';
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

function calculateNextRunAt(
  frequency: string,
  dayOfWeek: number | null,
  dayOfMonth: number | null,
  hour: number,
  timezone: string
): Date {
  // TODO: Implement proper timezone-aware scheduling
  // For now, using a simple calculation based on UTC
  const now = new Date();
  const nextRun = new Date();

  nextRun.setHours(hour, 0, 0, 0);

  if (frequency === 'daily') {
    // If today's hour has passed, schedule for tomorrow
    if (now.getHours() >= hour) {
      nextRun.setDate(nextRun.getDate() + 1);
    }
  } else if (frequency === 'weekly' && dayOfWeek !== null) {
    // Calculate days until next occurrence
    const currentDay = now.getDay();
    let daysUntil = dayOfWeek - currentDay;

    if (daysUntil < 0 || (daysUntil === 0 && now.getHours() >= hour)) {
      daysUntil += 7;
    }

    nextRun.setDate(nextRun.getDate() + daysUntil);
  } else if (frequency === 'monthly' && dayOfMonth !== null) {
    // Set to the specified day of month
    nextRun.setDate(dayOfMonth);

    // If it's already passed this month, move to next month
    if (nextRun <= now) {
      nextRun.setMonth(nextRun.getMonth() + 1);
    }
  }

  return nextRun;
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
    const conditions = [eq(scheduledReports.organizationId, membership.organization.id)];

    if (domainId) {
      // Get reports for specific domain OR org-wide reports
      conditions.push(
        or(
          eq(scheduledReports.domainId, domainId),
          isNull(scheduledReports.domainId)
        )!
      );
    }

    // Get scheduled reports with domain information
    const reportsList = await db
      .select({
        report: scheduledReports,
        domain: domains,
      })
      .from(scheduledReports)
      .leftJoin(domains, eq(scheduledReports.domainId, domains.id))
      .where(and(...conditions))
      .orderBy(scheduledReports.createdAt);

    return NextResponse.json(
      reportsList.map((r) => ({
        ...r.report,
        domain: r.domain,
      }))
    );
  } catch (error) {
    console.error('Failed to fetch scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports' },
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
      'member',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      domainId,
      frequency,
      dayOfWeek,
      dayOfMonth,
      hour,
      timezone,
      recipients,
      includeCharts,
      includeSources,
      includeFailures,
    } = body;

    // Validation
    if (!name || !frequency || !recipients) {
      return NextResponse.json(
        { error: 'Name, frequency, and recipients are required' },
        { status: 400 }
      );
    }

    if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
      return NextResponse.json(
        { error: 'Invalid frequency. Must be daily, weekly, or monthly' },
        { status: 400 }
      );
    }

    if (frequency === 'weekly' && (dayOfWeek === null || dayOfWeek === undefined)) {
      return NextResponse.json(
        { error: 'Day of week is required for weekly reports' },
        { status: 400 }
      );
    }

    if (frequency === 'monthly' && (dayOfMonth === null || dayOfMonth === undefined)) {
      return NextResponse.json(
        { error: 'Day of month is required for monthly reports' },
        { status: 400 }
      );
    }

    // Validate recipients JSON
    try {
      const recipientsArray = JSON.parse(recipients);
      if (!Array.isArray(recipientsArray) || recipientsArray.length === 0) {
        return NextResponse.json(
          { error: 'Recipients must be a non-empty array' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid recipients format' },
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

    // Calculate next run time
    const nextRunAt = calculateNextRunAt(
      frequency,
      dayOfWeek,
      dayOfMonth,
      hour || 9,
      timezone || 'UTC'
    );

    // Create scheduled report
    const [newReport] = await db
      .insert(scheduledReports)
      .values({
        organizationId: membership.organization.id,
        domainId: domainId || null,
        name,
        frequency,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : null,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : null,
        hour: hour || 9,
        timezone: timezone || 'UTC',
        recipients,
        includeCharts: includeCharts ?? true,
        includeSources: includeSources ?? true,
        includeFailures: includeFailures ?? true,
        nextRunAt,
        isActive: true,
        createdBy: session.user.id,
      })
      .returning();

    return NextResponse.json(newReport);
  } catch (error) {
    console.error('Failed to create scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled report' },
      { status: 500 }
    );
  }
}
