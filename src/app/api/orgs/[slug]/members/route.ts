import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this organization
    const [orgAccess] = await db
      .select({
        organizationId: organizations.id,
        role: orgMembers.role,
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

    if (!orgAccess) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get all members of the organization with their user info
    const members = await db
      .select({
        id: orgMembers.id,
        userId: orgMembers.userId,
        role: orgMembers.role,
        joinedAt: orgMembers.joinedAt,
        invitedBy: orgMembers.invitedBy,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          image: users.image,
        },
      })
      .from(orgMembers)
      .innerJoin(users, eq(orgMembers.userId, users.id))
      .where(eq(orgMembers.organizationId, orgAccess.organizationId))
      .orderBy(orgMembers.joinedAt);

    // Get inviter names
    const membersWithInviters = await Promise.all(
      members.map(async (member) => {
        if (member.invitedBy) {
          const [inviter] = await db
            .select({
              name: users.name,
              email: users.email,
            })
            .from(users)
            .where(eq(users.id, member.invitedBy))
            .limit(1);

          return {
            ...member,
            inviter: inviter || null,
          };
        }
        return {
          ...member,
          inviter: null,
        };
      })
    );

    return NextResponse.json({
      members: membersWithInviters,
      currentUserRole: orgAccess.role,
    });
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}
