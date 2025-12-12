import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domainTags } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; tagId: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string, requiredRoles?: string[]) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  if (!result) return null;
  if (requiredRoles && !requiredRoles.includes(result.role)) return null;

  return result;
}

// PATCH /api/orgs/[slug]/tags/[tagId] - Update a tag
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, tagId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOrgAndCheckAccess(slug, session.user.id, ['owner', 'admin', 'member']);

    if (!result) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
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

    const body = await request.json();
    const updateData: Record<string, string> = {};

    if (body.name && typeof body.name === 'string') {
      if (body.name.length > 50) {
        return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    if (body.color && /^#[0-9A-Fa-f]{6}$/.test(body.color)) {
      updateData.color = body.color;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const [updated] = await db
      .update(domainTags)
      .set(updateData)
      .where(eq(domainTags.id, tagId))
      .returning({
        id: domainTags.id,
        name: domainTags.name,
        color: domainTags.color,
      });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating tag:', error);
    return NextResponse.json({ error: 'Failed to update tag' }, { status: 500 });
  }
}

// DELETE /api/orgs/[slug]/tags/[tagId] - Delete a tag
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, tagId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOrgAndCheckAccess(slug, session.user.id, ['owner', 'admin', 'member']);

    if (!result) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
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

    await db.delete(domainTags).where(eq(domainTags.id, tagId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting tag:', error);
    return NextResponse.json({ error: 'Failed to delete tag' }, { status: 500 });
  }
}
