import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, sources } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { autoMatchDomainSources, autoMatchSource } from '@/lib/known-sender-matcher';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
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

async function getDomainWithAccess(
  domainId: string,
  orgId: string
) {
  const [domain] = await db
    .select()
    .from(domains)
    .where(
      and(
        eq(domains.id, domainId),
        eq(domains.organizationId, orgId)
      )
    )
    .limit(1);

  return domain;
}

/**
 * POST /api/orgs/[slug]/domains/[domainId]/sources/match
 * Auto-match sources to known senders
 * Body: { sourceId?: string } - if provided, match only that source, otherwise match all
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

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
        { status: 404 }
      );
    }

    const domain = await getDomainWithAccess(domainId, membership.organization.id);

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { sourceId } = body;

    if (sourceId) {
      // Match single source
      const match = await autoMatchSource(sourceId, membership.organization.id);

      if (match) {
        await db
          .update(sources)
          .set({
            knownSenderId: match.id,
            updatedAt: new Date(),
          })
          .where(eq(sources.id, sourceId));

        return NextResponse.json({
          matched: 1,
          total: 1,
          sender: match,
        });
      }

      return NextResponse.json({
        matched: 0,
        total: 1,
        sender: null,
      });
    } else {
      // Match all sources for the domain
      const result = await autoMatchDomainSources(
        domainId,
        membership.organization.id
      );

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Failed to match sources:', error);
    return NextResponse.json(
      { error: 'Failed to match sources' },
      { status: 500 }
    );
  }
}
