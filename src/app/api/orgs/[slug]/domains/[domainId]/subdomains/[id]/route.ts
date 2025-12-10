import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, subdomains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string; id: string }>;
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

/**
 * PATCH /api/orgs/[slug]/domains/[domainId]/subdomains/[id]
 * Update a subdomain's policy override
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId, id } = await params;

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

    // Verify subdomain belongs to domain
    const [subdomain] = await db
      .select()
      .from(subdomains)
      .where(
        and(
          eq(subdomains.id, id),
          eq(subdomains.domainId, domainId)
        )
      )
      .limit(1);

    if (!subdomain) {
      return NextResponse.json(
        { error: 'Subdomain not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { policyOverride } = body;

    // Validate policyOverride value
    if (policyOverride !== null && !['none', 'quarantine', 'reject'].includes(policyOverride)) {
      return NextResponse.json(
        { error: 'Invalid policy override value. Must be one of: none, quarantine, reject, or null' },
        { status: 400 }
      );
    }

    const [updatedSubdomain] = await db
      .update(subdomains)
      .set({
        policyOverride: policyOverride,
        updatedAt: new Date(),
      })
      .where(eq(subdomains.id, id))
      .returning();

    return NextResponse.json(updatedSubdomain);
  } catch (error) {
    console.error('Failed to update subdomain:', error);
    return NextResponse.json(
      { error: 'Failed to update subdomain' },
      { status: 500 }
    );
  }
}
