import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getPermissions, type MemberRole } from '@/lib/roles';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's membership in this organization
    const [membership] = await db
      .select({
        role: orgMembers.role,
        organizationId: organizations.id,
        organizationName: organizations.name,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(organizations.slug, slug),
          eq(orgMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!membership) {
      return NextResponse.json(
        { error: 'Not a member of this organization' },
        { status: 403 }
      );
    }

    // Return role and computed permissions
    const permissions = getPermissions(membership.role as MemberRole);

    return NextResponse.json({
      role: membership.role,
      permissions,
    });
  } catch (error) {
    console.error('Failed to fetch membership:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership' },
      { status: 500 }
    );
  }
}
