import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { exchangeCodeForTokens } from '@/lib/gmail';

export async function GET(request: Request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);

    if (!session?.user?.id) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Decode state to get org info
    let stateData: { orgId: string; orgSlug: string; userId: string };
    try {
      stateData = JSON.parse(Buffer.from(state || '', 'base64').toString());
    } catch {
      return NextResponse.redirect(new URL('/orgs?error=invalid_state', request.url));
    }

    const { orgSlug } = stateData;

    if (error) {
      return NextResponse.redirect(
        new URL(`/orgs/${orgSlug}/settings/gmail?error=${error}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL(`/orgs/${orgSlug}/settings/gmail?error=missing_params`, request.url)
      );
    }

    if (stateData.userId !== session.user.id) {
      return NextResponse.redirect(
        new URL(`/orgs/${orgSlug}/settings/gmail?error=invalid_state`, request.url)
      );
    }

    // Check access
    const [membership] = await db
      .select({
        organization: organizations,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(organizations.id, stateData.orgId),
          eq(orgMembers.userId, session.user.id)
        )
      );

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.redirect(
        new URL(`/orgs/${orgSlug}/settings/gmail?error=unauthorized`, request.url)
      );
    }

    // Exchange code for tokens
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get user's email from Google
    const userInfoResponse = await fetch(
      'https://www.googleapis.com/oauth2/v2/userinfo',
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    const userInfo = await userInfoResponse.json();
    const email = userInfo.email;

    if (!email) {
      return NextResponse.redirect(
        new URL(`/orgs/${orgSlug}/settings/gmail?error=no_email`, request.url)
      );
    }

    // Check if this Gmail account is already connected
    const existing = await db
      .select()
      .from(gmailAccounts)
      .where(
        and(
          eq(gmailAccounts.organizationId, stateData.orgId),
          eq(gmailAccounts.email, email)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing account
      await db
        .update(gmailAccounts)
        .set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiry: new Date(tokens.expiry_date),
          syncEnabled: true,
          updatedAt: new Date(),
        })
        .where(eq(gmailAccounts.id, existing[0].id));
    } else {
      // Create new Gmail account
      await db.insert(gmailAccounts).values({
        organizationId: stateData.orgId,
        email,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: new Date(tokens.expiry_date),
        addedBy: session.user.id,
        syncEnabled: true,
      });
    }

    return NextResponse.redirect(
      new URL(`/orgs/${orgSlug}/settings/gmail?success=true`, request.url)
    );
  } catch (error) {
    console.error('Gmail callback error:', error);
    return NextResponse.redirect(
      new URL('/orgs?error=gmail_callback_failed', request.url)
    );
  }
}
