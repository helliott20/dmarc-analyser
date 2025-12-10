import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, scheduledReports } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; reportId: string }>;
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
    const { slug, reportId } = await params;

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

    // Verify report belongs to this org
    const [report] = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, reportId),
          eq(scheduledReports.organizationId, membership.organization.id)
        )
      );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Failed to fetch scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled report' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, reportId } = await params;

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

    // Verify report belongs to this org
    const [report] = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, reportId),
          eq(scheduledReports.organizationId, membership.organization.id)
        )
      );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      frequency,
      dayOfWeek,
      dayOfMonth,
      hour,
      timezone,
      recipients,
      includeCharts,
      includeSources,
      includeFailures,
      isActive,
    } = body;

    // Build update object with only provided fields
    const updates: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updates.name = name;
    if (frequency !== undefined) {
      if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
        return NextResponse.json(
          { error: 'Invalid frequency' },
          { status: 400 }
        );
      }
      updates.frequency = frequency;
    }
    if (dayOfWeek !== undefined) updates.dayOfWeek = dayOfWeek;
    if (dayOfMonth !== undefined) updates.dayOfMonth = dayOfMonth;
    if (hour !== undefined) updates.hour = hour;
    if (timezone !== undefined) updates.timezone = timezone;
    if (recipients !== undefined) {
      // Validate recipients JSON
      try {
        const recipientsArray = JSON.parse(recipients);
        if (!Array.isArray(recipientsArray) || recipientsArray.length === 0) {
          return NextResponse.json(
            { error: 'Recipients must be a non-empty array' },
            { status: 400 }
          );
        }
        updates.recipients = recipients;
      } catch {
        return NextResponse.json(
          { error: 'Invalid recipients format' },
          { status: 400 }
        );
      }
    }
    if (includeCharts !== undefined) updates.includeCharts = includeCharts;
    if (includeSources !== undefined) updates.includeSources = includeSources;
    if (includeFailures !== undefined) updates.includeFailures = includeFailures;
    if (isActive !== undefined) updates.isActive = isActive;

    // Recalculate nextRunAt if schedule changed
    if (
      frequency !== undefined ||
      dayOfWeek !== undefined ||
      dayOfMonth !== undefined ||
      hour !== undefined ||
      timezone !== undefined
    ) {
      updates.nextRunAt = calculateNextRunAt(
        updates.frequency || report.frequency,
        updates.dayOfWeek !== undefined ? updates.dayOfWeek : report.dayOfWeek,
        updates.dayOfMonth !== undefined ? updates.dayOfMonth : report.dayOfMonth,
        updates.hour !== undefined ? updates.hour : report.hour,
        updates.timezone || report.timezone
      );
    }

    // Update report
    const [updatedReport] = await db
      .update(scheduledReports)
      .set(updates)
      .where(eq(scheduledReports.id, reportId))
      .returning();

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Failed to update scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to update scheduled report' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, reportId } = await params;

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

    // Verify report belongs to this org
    const [report] = await db
      .select()
      .from(scheduledReports)
      .where(
        and(
          eq(scheduledReports.id, reportId),
          eq(scheduledReports.organizationId, membership.organization.id)
        )
      );

    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Delete the report
    await db.delete(scheduledReports).where(eq(scheduledReports.id, reportId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete scheduled report:', error);
    return NextResponse.json(
      { error: 'Failed to delete scheduled report' },
      { status: 500 }
    );
  }
}
