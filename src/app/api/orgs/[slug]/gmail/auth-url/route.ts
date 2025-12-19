import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getGmailAuthUrl, getOrgOAuthCredentials, OAuthCredentials } from '@/lib/gmail';
import { isCentralInboxEnabled } from '@/lib/central-inbox';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check access
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

    const { organization } = membership;
    const centralInboxEnabled = isCentralInboxEnabled();
    const hasSystemOauth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

    let credentials: OAuthCredentials | null = null;

    // Determine which OAuth credentials to use
    if (centralInboxEnabled) {
      // Hosted version: Require BYOC
      if (!organization.useCustomOauth) {
        return NextResponse.json(
          { error: 'Custom OAuth is not enabled. Enable BYOC mode in Email Import settings first.' },
          { status: 400 }
        );
      }
      credentials = await getOrgOAuthCredentials(organization.id);
      if (!credentials) {
        return NextResponse.json(
          { error: 'No OAuth credentials configured. Add your Google Cloud credentials first.' },
          { status: 400 }
        );
      }
    } else {
      // Self-hosted version: Use system OAuth or BYOC
      if (hasSystemOauth) {
        // Use system-level OAuth from env vars
        credentials = {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        };
      } else if (organization.useCustomOauth) {
        // Fall back to BYOC if no system OAuth
        credentials = await getOrgOAuthCredentials(organization.id);
      }

      if (!credentials) {
        return NextResponse.json(
          { error: 'Gmail OAuth is not configured. Contact your administrator.' },
          { status: 400 }
        );
      }
    }

    // Create state with org info (encrypted in production)
    const state = Buffer.from(
      JSON.stringify({
        orgId: organization.id,
        orgSlug: slug,
        userId: session.user.id,
      })
    ).toString('base64');

    // Use a single global callback URL for Gmail OAuth
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/callback`;
    const url = getGmailAuthUrl(state, redirectUri, credentials);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to generate Gmail auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
