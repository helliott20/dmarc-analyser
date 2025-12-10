import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; accountId: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify access
    const [result] = await db
      .select({
        account: gmailAccounts,
      })
      .from(gmailAccounts)
      .innerJoin(organizations, eq(gmailAccounts.organizationId, organizations.id))
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(gmailAccounts.id, accountId),
          eq(organizations.slug, slug),
          eq(orgMembers.userId, session.user.id)
        )
      );

    if (!result) {
      return NextResponse.json(
        { error: 'Account not found or insufficient permissions' },
        { status: 404 }
      );
    }

    // Reset sync status to idle
    await db
      .update(gmailAccounts)
      .set({
        syncStatus: 'idle',
        syncProgress: null,
      })
      .where(eq(gmailAccounts.id, accountId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel sync:', error);
    return NextResponse.json(
      { error: 'Failed to cancel sync' },
      { status: 500 }
    );
  }
}
