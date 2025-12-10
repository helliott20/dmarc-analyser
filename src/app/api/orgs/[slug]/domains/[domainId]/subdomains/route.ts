import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, subdomains } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

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
 * GET /api/orgs/[slug]/domains/[domainId]/subdomains
 * List all subdomains for a domain with their stats
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

    // Get subdomains with stats
    const subdomainsList = await db
      .select({
        id: subdomains.id,
        subdomain: subdomains.subdomain,
        policyOverride: subdomains.policyOverride,
        firstSeen: subdomains.firstSeen,
        lastSeen: subdomains.lastSeen,
        messageCount: subdomains.messageCount,
        passCount: subdomains.passCount,
        failCount: subdomains.failCount,
        createdAt: subdomains.createdAt,
        updatedAt: subdomains.updatedAt,
      })
      .from(subdomains)
      .where(eq(subdomains.domainId, domainId))
      .orderBy(desc(subdomains.messageCount));

    // Calculate pass rates
    const subdomainsWithStats = subdomainsList.map((sub) => {
      const messageCount = Number(sub.messageCount);
      const passCount = Number(sub.passCount);
      const failCount = Number(sub.failCount);
      const passRate = messageCount > 0 ? (passCount / messageCount) * 100 : 0;

      return {
        ...sub,
        messageCount,
        passCount,
        failCount,
        passRate: Math.round(passRate * 10) / 10,
      };
    });

    return NextResponse.json(subdomainsWithStats);
  } catch (error) {
    console.error('Failed to fetch subdomains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subdomains' },
      { status: 500 }
    );
  }
}
