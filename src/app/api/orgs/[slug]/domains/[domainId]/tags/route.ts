import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, domainTags, domainTagAssignments } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

async function getDomainWithAccess(domainId: string, orgSlug: string, userId: string, requiredRoles?: string[]) {
  const [result] = await db
    .select({
      domain: domains,
      organization: organizations,
      role: orgMembers.role,
    })
    .from(domains)
    .innerJoin(organizations, eq(domains.organizationId, organizations.id))
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(domains.id, domainId),
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  if (!result) return null;
  if (requiredRoles && !requiredRoles.includes(result.role)) return null;

  return result;
}

// GET /api/orgs/[slug]/domains/[domainId]/tags - Get tags assigned to a domain
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id);

    if (!result) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const tags = await db
      .select({
        id: domainTags.id,
        name: domainTags.name,
        color: domainTags.color,
      })
      .from(domainTagAssignments)
      .innerJoin(domainTags, eq(domainTagAssignments.tagId, domainTags.id))
      .where(eq(domainTagAssignments.domainId, domainId))
      .orderBy(domainTags.name);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching domain tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/orgs/[slug]/domains/[domainId]/tags - Add a tag to a domain
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id, ['owner', 'admin', 'member']);

    if (!result) {
      return NextResponse.json({ error: 'Domain not found or insufficient permissions' }, { status: 404 });
    }

    const body = await request.json();
    const { tagId } = body;

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    // Verify tag belongs to this org
    const [tag] = await db
      .select({ id: domainTags.id })
      .from(domainTags)
      .where(
        and(
          eq(domainTags.id, tagId),
          eq(domainTags.organizationId, result.organization.id)
        )
      );

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Check if already assigned
    const [existing] = await db
      .select({ id: domainTagAssignments.id })
      .from(domainTagAssignments)
      .where(
        and(
          eq(domainTagAssignments.domainId, domainId),
          eq(domainTagAssignments.tagId, tagId)
        )
      );

    if (existing) {
      return NextResponse.json({ error: 'Tag already assigned to this domain' }, { status: 409 });
    }

    await db.insert(domainTagAssignments).values({
      domainId,
      tagId,
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('Error adding tag to domain:', error);
    return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
  }
}

// PUT /api/orgs/[slug]/domains/[domainId]/tags - Replace all tags for a domain
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id, ['owner', 'admin', 'member']);

    if (!result) {
      return NextResponse.json({ error: 'Domain not found or insufficient permissions' }, { status: 404 });
    }

    const body = await request.json();
    const { tagIds } = body;

    if (!Array.isArray(tagIds)) {
      return NextResponse.json({ error: 'tagIds must be an array' }, { status: 400 });
    }

    // Verify all tags belong to this org
    if (tagIds.length > 0) {
      const validTags = await db
        .select({ id: domainTags.id })
        .from(domainTags)
        .where(
          and(
            inArray(domainTags.id, tagIds),
            eq(domainTags.organizationId, result.organization.id)
          )
        );

      if (validTags.length !== tagIds.length) {
        return NextResponse.json({ error: 'One or more tags not found' }, { status: 400 });
      }
    }

    // Delete existing assignments
    await db.delete(domainTagAssignments).where(eq(domainTagAssignments.domainId, domainId));

    // Insert new assignments
    if (tagIds.length > 0) {
      await db.insert(domainTagAssignments).values(
        tagIds.map((tagId: string) => ({
          domainId,
          tagId,
        }))
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating domain tags:', error);
    return NextResponse.json({ error: 'Failed to update tags' }, { status: 500 });
  }
}

// DELETE /api/orgs/[slug]/domains/[domainId]/tags?tagId=xxx - Remove a tag from a domain
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id, ['owner', 'admin', 'member']);

    if (!result) {
      return NextResponse.json({ error: 'Domain not found or insufficient permissions' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get('tagId');

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    await db.delete(domainTagAssignments).where(
      and(
        eq(domainTagAssignments.domainId, domainId),
        eq(domainTagAssignments.tagId, tagId)
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing tag from domain:', error);
    return NextResponse.json({ error: 'Failed to remove tag' }, { status: 500 });
  }
}
