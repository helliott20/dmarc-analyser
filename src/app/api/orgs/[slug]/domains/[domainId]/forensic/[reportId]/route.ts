import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, forensicReports } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string; reportId: string }>;
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
 * GET /api/orgs/[slug]/domains/[domainId]/forensic/[reportId]
 * Get a single forensic report with full details
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId, reportId } = await params;

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

    // Get the forensic report
    const [report] = await db
      .select()
      .from(forensicReports)
      .where(
        and(
          eq(forensicReports.id, reportId),
          eq(forensicReports.domainId, domainId)
        )
      )
      .limit(1);

    if (!report) {
      return NextResponse.json(
        { error: 'Forensic report not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Failed to fetch forensic report:', error);
    return NextResponse.json(
      { error: 'Failed to fetch forensic report' },
      { status: 500 }
    );
  }
}
