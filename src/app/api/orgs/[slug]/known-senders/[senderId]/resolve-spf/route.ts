import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, knownSenders } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveSpfInclude } from '@/lib/spf-resolver';

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
 * POST /api/orgs/[slug]/known-senders/[senderId]/resolve-spf
 * Resolve SPF include and update IP ranges
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    // Only allow modifying org-specific senders
    if (sender.isGlobal || sender.organizationId !== membership.organization.id) {
      return NextResponse.json(
        { error: 'Cannot modify this known sender' },
        { status: 403 }
      );
    }

    // Check if SPF include is set
    if (!sender.spfInclude) {
      return NextResponse.json(
        { error: 'No SPF include configured for this sender' },
        { status: 400 }
      );
    }

    // Resolve SPF include
    const result = await resolveSpfInclude(sender.spfInclude);

    if (result.ipRanges.length === 0 && result.errors.length > 0) {
      return NextResponse.json(
        { error: result.errors[0], errors: result.errors },
        { status: 400 }
      );
    }

    // Update the sender with resolved IP ranges
    const [updatedSender] = await db
      .update(knownSenders)
      .set({
        ipRanges: result.ipRanges,
        spfResolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(knownSenders.id, senderId))
      .returning();

    return NextResponse.json({
      sender: updatedSender,
      resolved: {
        ipRanges: result.ipRanges,
        includes: result.includes,
        errors: result.errors,
      },
    });
  } catch (error) {
    console.error('Failed to resolve SPF:', error);
    return NextResponse.json(
      { error: 'Failed to resolve SPF' },
      { status: 500 }
    );
  }
}
