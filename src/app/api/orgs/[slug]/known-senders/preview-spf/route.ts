import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { resolveSpfInclude } from '@/lib/spf-resolver';

interface RouteParams {
  params: Promise<{ slug: string }>;
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

  return membership || null;
}

/**
 * POST /api/orgs/[slug]/known-senders/preview-spf
 * Preview SPF resolution without saving
 */
export async function POST(request: Request, { params }: RouteParams) {
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

    const body = await request.json();
    const { spfInclude } = body;

    if (!spfInclude) {
      return NextResponse.json(
        { error: 'SPF include domain is required' },
        { status: 400 }
      );
    }

    // Resolve SPF include
    const result = await resolveSpfInclude(spfInclude);

    return NextResponse.json({
      spfInclude,
      ipRanges: result.ipRanges,
      includes: result.includes,
      errors: result.errors,
      success: result.ipRanges.length > 0,
    });
  } catch (error) {
    console.error('Failed to preview SPF:', error);
    return NextResponse.json(
      { error: 'Failed to resolve SPF' },
      { status: 500 }
    );
  }
}
