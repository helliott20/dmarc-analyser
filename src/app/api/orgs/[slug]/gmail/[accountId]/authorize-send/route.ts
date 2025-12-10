import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getGmailAuthUrl } from '@/lib/gmail';

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

    // Check organization membership and admin/owner role
    const [membership] = await db
      .select({
        organization: organizations,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, session.user.id)));

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Verify the Gmail account exists and belongs to this org
    const [account] = await db
      .select()
      .from(gmailAccounts)
      .where(
        and(
          eq(gmailAccounts.id, accountId),
          eq(gmailAccounts.organizationId, membership.organization.id)
        )
      );

    if (!account) {
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      );
    }

    // Create state with org info and accountId for the callback
    const state = Buffer.from(
      JSON.stringify({
        orgId: membership.organization.id,
        orgSlug: slug,
        userId: session.user.id,
        accountId: accountId,
        authType: 'send', // Mark this as a send authorization
      })
    ).toString('base64');

    // Use the same callback URL but with send type in state
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/callback`;
    const authUrl = getGmailAuthUrl(state, redirectUri);

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error('Failed to generate Gmail send auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
