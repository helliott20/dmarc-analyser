import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// GET - Check onboarding status
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user has any organizations
    const memberships = await db
      .select({
        organization: organizations,
        role: orgMembers.role,
      })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
      .where(eq(orgMembers.userId, session.user.id));

    const needsOnboarding = memberships.length === 0;

    return NextResponse.json({
      needsOnboarding,
      hasOrganizations: memberships.length > 0,
      organizationCount: memberships.length,
    });
  } catch (error) {
    console.error('Failed to check onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to check onboarding status' },
      { status: 500 }
    );
  }
}

// POST - Mark onboarding complete or save progress
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { completed, progress } = await request.json();

    // For now, we'll just return success
    // In the future, we could store progress in a separate table or user preferences

    return NextResponse.json({
      success: true,
      completed,
      progress,
    });
  } catch (error) {
    console.error('Failed to update onboarding status:', error);
    return NextResponse.json(
      { error: 'Failed to update onboarding status' },
      { status: 500 }
    );
  }
}
