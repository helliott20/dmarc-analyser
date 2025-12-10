import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, sources } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string; sourceId: string }>;
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
 * PATCH /api/orgs/[slug]/domains/[domainId]/sources/[sourceId]
 * Update a source (e.g., link to known sender, change type, add notes)
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId, sourceId } = await params;

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

    // Verify source belongs to domain
    const [source] = await db
      .select()
      .from(sources)
      .where(
        and(
          eq(sources.id, sourceId),
          eq(sources.domainId, domainId)
        )
      )
      .limit(1);

    if (!source) {
      return NextResponse.json(
        { error: 'Source not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { knownSenderId, sourceType, notes } = body;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (knownSenderId !== undefined) {
      updateData.knownSenderId = knownSenderId;
    }

    if (sourceType !== undefined) {
      updateData.sourceType = sourceType;
      updateData.classifiedBy = session.user.id;
      updateData.classifiedAt = new Date();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const [updatedSource] = await db
      .update(sources)
      .set(updateData)
      .where(eq(sources.id, sourceId))
      .returning();

    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error('Failed to update source:', error);
    return NextResponse.json(
      { error: 'Failed to update source' },
      { status: 500 }
    );
  }
}
