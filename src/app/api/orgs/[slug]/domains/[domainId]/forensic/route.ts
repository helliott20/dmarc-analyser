import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, forensicReports } from '@/db/schema';
import { eq, and, desc, gte, lte, sql, count } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
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

/**
 * GET /api/orgs/[slug]/domains/[domainId]/forensic
 * List forensic reports with pagination and filtering
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or access denied' },
        { status: 404 }
      );
    }

    // Verify domain belongs to org
    const [domain] = await db
      .select()
      .from(domains)
      .where(
        and(
          eq(domains.id, domainId),
          eq(domains.organizationId, membership.organization.id)
        )
      )
      .limit(1);

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const feedbackType = searchParams.get('feedbackType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const offset = (page - 1) * limit;

    // Build WHERE conditions
    const conditions = [eq(forensicReports.domainId, domainId)];

    if (feedbackType && feedbackType !== 'all') {
      conditions.push(eq(forensicReports.feedbackType, feedbackType as any));
    }

    if (startDate) {
      conditions.push(gte(forensicReports.arrivalDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(lte(forensicReports.arrivalDate, new Date(endDate)));
    }

    const whereClause = and(...conditions);

    // Get total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(forensicReports)
      .where(whereClause);

    const total = totalResult?.count || 0;

    // Get paginated results
    const reports = await db
      .select({
        id: forensicReports.id,
        reportId: forensicReports.reportId,
        feedbackType: forensicReports.feedbackType,
        reporterOrgName: forensicReports.reporterOrgName,
        arrivalDate: forensicReports.arrivalDate,
        sourceIp: forensicReports.sourceIp,
        originalMailFrom: forensicReports.originalMailFrom,
        originalRcptTo: forensicReports.originalRcptTo,
        subject: forensicReports.subject,
        messageId: forensicReports.messageId,
        authResults: forensicReports.authResults,
        dkimResult: forensicReports.dkimResult,
        spfResult: forensicReports.spfResult,
        dkimDomain: forensicReports.dkimDomain,
        spfDomain: forensicReports.spfDomain,
        createdAt: forensicReports.createdAt,
      })
      .from(forensicReports)
      .where(whereClause)
      .orderBy(desc(forensicReports.arrivalDate))
      .limit(limit)
      .offset(offset);

    // Get summary stats
    const statsQuery = await db
      .select({
        feedbackType: forensicReports.feedbackType,
        count: count(),
      })
      .from(forensicReports)
      .where(eq(forensicReports.domainId, domainId))
      .groupBy(forensicReports.feedbackType);

    const stats = statsQuery.reduce((acc, stat) => {
      if (stat.feedbackType) {
        acc[stat.feedbackType] = stat.count;
      }
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats,
    });
  } catch (error) {
    console.error('Failed to fetch forensic reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forensic reports' },
      { status: 500 }
    );
  }
}
