import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, knownSenders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; senderId: string }>;
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
 * GET /api/orgs/[slug]/known-senders/[senderId]
 * Fetch a specific known sender
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, senderId } = await params;

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

    const [sender] = await db
      .select()
      .from(knownSenders)
      .where(eq(knownSenders.id, senderId))
      .limit(1);

    if (!sender) {
      return NextResponse.json(
        { error: 'Known sender not found' },
        { status: 404 }
      );
    }

    // Check if user has access (global or org-specific)
    if (!sender.isGlobal && sender.organizationId !== membership.organization.id) {
      return NextResponse.json(
        { error: 'Known sender not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(sender);
  } catch (error) {
    console.error('Failed to fetch known sender:', error);
    return NextResponse.json(
      { error: 'Failed to fetch known sender' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/orgs/[slug]/known-senders/[senderId]
 * Update an organization-specific known sender
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, senderId } = await params;

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

    const [sender] = await db
      .select()
      .from(knownSenders)
      .where(eq(knownSenders.id, senderId))
      .limit(1);

    if (!sender) {
      return NextResponse.json(
        { error: 'Known sender not found' },
        { status: 404 }
      );
    }

    // Only allow editing org-specific senders
    if (sender.isGlobal || sender.organizationId !== membership.organization.id) {
      return NextResponse.json(
        { error: 'Cannot modify this known sender' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, category, logoUrl, website, ipRanges, dkimDomains, spfInclude } = body;

    const [updatedSender] = await db
      .update(knownSenders)
      .set({
        name: name ?? sender.name,
        description: description !== undefined ? description : sender.description,
        category: category ?? sender.category,
        logoUrl: logoUrl !== undefined ? logoUrl : sender.logoUrl,
        website: website !== undefined ? website : sender.website,
        ipRanges: ipRanges !== undefined ? ipRanges : sender.ipRanges,
        dkimDomains: dkimDomains !== undefined ? dkimDomains : sender.dkimDomains,
        spfInclude: spfInclude !== undefined ? spfInclude : sender.spfInclude,
        updatedAt: new Date(),
      })
      .where(eq(knownSenders.id, senderId))
      .returning();

    return NextResponse.json(updatedSender);
  } catch (error) {
    console.error('Failed to update known sender:', error);
    return NextResponse.json(
      { error: 'Failed to update known sender' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/orgs/[slug]/known-senders/[senderId]
 * Delete an organization-specific known sender
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, senderId } = await params;

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

    const [sender] = await db
      .select()
      .from(knownSenders)
      .where(eq(knownSenders.id, senderId))
      .limit(1);

    if (!sender) {
      return NextResponse.json(
        { error: 'Known sender not found' },
        { status: 404 }
      );
    }

    // Only allow deleting org-specific senders
    if (sender.isGlobal || sender.organizationId !== membership.organization.id) {
      return NextResponse.json(
        { error: 'Cannot delete this known sender' },
        { status: 403 }
      );
    }

    await db.delete(knownSenders).where(eq(knownSenders.id, senderId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete known sender:', error);
    return NextResponse.json(
      { error: 'Failed to delete known sender' },
      { status: 500 }
    );
  }
}
