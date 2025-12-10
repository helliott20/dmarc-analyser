import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, scheduledReports, domains } from '@/db/schema';
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

export async function POST(request: Request, { params }: RouteParams) {
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

    // Get the scheduled report with domain info
    const [result] = await db
      .select({
        report: scheduledReports,
        domain: domains,
      })
      .from(scheduledReports)
      .leftJoin(domains, eq(scheduledReports.domainId, domains.id))
      .where(
        and(
          eq(scheduledReports.id, reportId),
          eq(scheduledReports.organizationId, membership.organization.id)
        )
      );

    if (!result) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const { report, domain } = result;

    // Parse recipients
    let recipients: string[] = [];
    try {
      recipients = JSON.parse(report.recipients);
      if (!Array.isArray(recipients) || recipients.length === 0) {
        return NextResponse.json(
          { error: 'No recipients configured for this report' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Invalid recipients configuration' },
        { status: 400 }
      );
    }

    // TODO: Implement actual email sending logic here
    // This is where you would:
    // 1. Fetch DMARC data for the report period
    // 2. Generate report content (HTML email)
    // 3. Include charts if report.includeCharts is true
    // 4. Include sources if report.includeSources is true
    // 5. Include failures if report.includeFailures is true
    // 6. Send email to all recipients
    //
    // Example pseudo-code:
    // const reportData = await fetchDmarcData(report.domainId, report.frequency);
    // const htmlContent = await generateReportEmail(reportData, {
    //   includeCharts: report.includeCharts,
    //   includeSources: report.includeSources,
    //   includeFailures: report.includeFailures,
    // });
    // await sendEmail({
    //   to: recipients,
    //   subject: `DMARC Report: ${report.name}`,
    //   html: htmlContent,
    // });

    console.log('Test send scheduled report:', {
      reportId: report.id,
      reportName: report.name,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      domainId: report.domainId,
      domainName: domain?.domain || 'All domains',
      frequency: report.frequency,
      recipients,
      includeCharts: report.includeCharts,
      includeSources: report.includeSources,
      includeFailures: report.includeFailures,
      timezone: report.timezone,
    });

    // For now, just log and return success
    return NextResponse.json({
      success: true,
      message: 'Test email would be sent to: ' + recipients.join(', '),
      note: 'Email sending not yet implemented. Check server logs for details.',
    });
  } catch (error) {
    console.error('Failed to send test report:', error);
    return NextResponse.json(
      { error: 'Failed to send test report' },
      { status: 500 }
    );
  }
}
