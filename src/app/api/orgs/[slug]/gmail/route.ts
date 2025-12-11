import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return result;
}

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

    const accounts = await db
      .select({
        id: gmailAccounts.id,
        email: gmailAccounts.email,
        syncEnabled: gmailAccounts.syncEnabled,
        sendEnabled: gmailAccounts.sendEnabled,
        lastSyncAt: gmailAccounts.lastSyncAt,
        createdAt: gmailAccounts.createdAt,
        syncStatus: gmailAccounts.syncStatus,
        syncProgress: gmailAccounts.syncProgress,
      })
      .from(gmailAccounts)
      .where(eq(gmailAccounts.organizationId, result.organization.id))
      .orderBy(gmailAccounts.email);

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching Gmail accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Gmail accounts' },
      { status: 500 }
    );
  }
}
