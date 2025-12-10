import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getGmailAuthUrl } from '@/lib/gmail';

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

    // Create state with org info (encrypted in production)
    const state = Buffer.from(
      JSON.stringify({
        orgId: membership.organization.id,
        orgSlug: slug,
        userId: session.user.id,
      })
    ).toString('base64');

    // Use a single global callback URL for Gmail OAuth
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/gmail/callback`;
    const url = getGmailAuthUrl(state, redirectUri);

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Failed to generate Gmail auth URL:', error);
    return NextResponse.json(
      { error: 'Failed to generate auth URL' },
      { status: 500 }
    );
  }
}
