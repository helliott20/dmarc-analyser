import { auth } from '@/lib/auth';
import { db } from '@/db';
import { invitations, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { InvitationAcceptClient } from '@/components/team/invitation-accept-client';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getInvitationData(token: string) {
  try {
    // Query database directly instead of fetching our own API
    const [invitation] = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        organizationId: invitations.organizationId,
      })
      .from(invitations)
      .where(eq(invitations.token, token))
      .limit(1);

    if (!invitation) {
      return { data: null, error: 'Invalid invitation' };
    }

    if (invitation.acceptedAt) {
      return { data: null, error: 'Invitation already accepted' };
    }

    if (invitation.expiresAt < new Date()) {
      return { data: null, error: 'Invitation expired' };
    }

    // Get organization details
    const [organization] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizations)
      .where(eq(organizations.id, invitation.organizationId))
      .limit(1);

    if (!organization) {
      return { data: null, error: 'Organisation not found' };
    }

    return {
      data: {
        invitation: {
          email: invitation.email,
          role: invitation.role,
          expiresAt: invitation.expiresAt.toISOString(),
        },
        organization: {
          name: organization.name,
          slug: organization.slug,
        },
      },
      error: null,
    };
  } catch (error) {
    console.error('Failed to fetch invitation:', error);
    return { data: null, error: 'Failed to load invitation' };
  }
}

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const session = await auth();

  // Fetch invitation data
  const { data, error } = await getInvitationData(token);

  return (
    <InvitationAcceptClient
      token={token}
      initialData={data}
      error={error || undefined}
      isAuthenticated={!!session?.user}
      userEmail={session?.user?.email || undefined}
    />
  );
}
