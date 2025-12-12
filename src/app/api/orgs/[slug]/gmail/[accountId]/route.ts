import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; accountId: string }>;
}

async function getAccountWithAccess(
  accountId: string,
  orgSlug: string,
  userId: string,
  requiredRoles?: string[]
) {
  const [result] = await db
    .select({
      account: gmailAccounts,
      organization: organizations,
      role: orgMembers.role,
    })
    .from(gmailAccounts)
    .innerJoin(organizations, eq(gmailAccounts.organizationId, organizations.id))
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(gmailAccounts.id, accountId),
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  if (!result) return null;

  if (requiredRoles && !requiredRoles.includes(result.role)) {
    return null;
  }

  return result;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getAccountWithAccess(accountId, slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!result) {
      return NextResponse.json(
        { error: 'Account not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // Handle syncEnabled toggle
    if (typeof body.syncEnabled === 'boolean') {
      updateData.syncEnabled = body.syncEnabled;
    }

    // Handle notifyNewDomains toggle
    if (typeof body.notifyNewDomains === 'boolean') {
      updateData.notifyNewDomains = body.notifyNewDomains;
    }

    // Handle resetting lastSyncAt (for "Import All" functionality)
    if (body.resetLastSync === true) {
      updateData.lastSyncAt = null;
    }

    await db
      .update(gmailAccounts)
      .set(updateData)
      .where(eq(gmailAccounts.id, accountId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update Gmail account:', error);
    return NextResponse.json(
      { error: 'Failed to update account' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getAccountWithAccess(accountId, slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!result) {
      return NextResponse.json(
        { error: 'Account not found or insufficient permissions' },
        { status: 404 }
      );
    }

    await db.delete(gmailAccounts).where(eq(gmailAccounts.id, accountId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete Gmail account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
