import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, knownSenders } from '@/db/schema';
import { eq, and, or, isNull } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
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
 * GET /api/orgs/[slug]/known-senders
 * Fetch all known senders available to this organization (global + org-specific)
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Fetch global and org-specific known senders
    const senders = await db
      .select()
      .from(knownSenders)
      .where(
        or(
          eq(knownSenders.isGlobal, true),
          eq(knownSenders.organizationId, membership.organization.id)
        )
      )
      .orderBy(knownSenders.name);

    return NextResponse.json(senders);
  } catch (error) {
    console.error('Failed to fetch known senders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch known senders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/orgs/[slug]/known-senders
 * Create a new organization-specific known sender
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, description, category, logoUrl, website, ipRanges, dkimDomains, spfInclude } = body;

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      );
    }

    // Create org-specific known sender
    const [newSender] = await db
      .insert(knownSenders)
      .values({
        name,
        description: description || null,
        category,
        logoUrl: logoUrl || null,
        website: website || null,
        ipRanges: ipRanges || null,
        dkimDomains: dkimDomains || null,
        spfInclude: spfInclude || null,
        isGlobal: false,
        organizationId: membership.organization.id,
      })
      .returning();

    return NextResponse.json(newSender);
  } catch (error) {
    console.error('Failed to create known sender:', error);
    return NextResponse.json(
      { error: 'Failed to create known sender' },
      { status: 500 }
    );
  }
}
