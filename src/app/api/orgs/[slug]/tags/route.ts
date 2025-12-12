import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domainTags } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
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

// GET /api/orgs/[slug]/tags - List all tags for the organization
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOrgAndCheckAccess(slug, session.user.id);

    if (!result) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const tags = await db
      .select({
        id: domainTags.id,
        name: domainTags.name,
        color: domainTags.color,
      })
      .from(domainTags)
      .where(eq(domainTags.organizationId, result.organization.id))
      .orderBy(domainTags.name);

    return NextResponse.json(tags);
  } catch (error) {
    console.error('Error fetching tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}

// POST /api/orgs/[slug]/tags - Create a new tag
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getOrgAndCheckAccess(slug, session.user.id, ['owner', 'admin', 'member']);

    if (!result) {
      return NextResponse.json({ error: 'Organization not found or insufficient permissions' }, { status: 404 });
    }

    const body = await request.json();
    const { name, color } = body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Tag name is required' }, { status: 400 });
    }

    if (name.length > 50) {
      return NextResponse.json({ error: 'Tag name must be 50 characters or less' }, { status: 400 });
    }

    // Validate color format if provided
    const tagColor = color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#6b7280';

    // Check if tag already exists
    const [existing] = await db
      .select({ id: domainTags.id })
      .from(domainTags)
      .where(
        and(
          eq(domainTags.organizationId, result.organization.id),
          eq(domainTags.name, name.trim())
        )
      );

    if (existing) {
      return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 });
    }

    const [newTag] = await db
      .insert(domainTags)
      .values({
        organizationId: result.organization.id,
        name: name.trim(),
        color: tagColor,
      })
      .returning({
        id: domainTags.id,
        name: domainTags.name,
        color: domainTags.color,
      });

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error('Error creating tag:', error);
    return NextResponse.json({ error: 'Failed to create tag' }, { status: 500 });
  }
}
