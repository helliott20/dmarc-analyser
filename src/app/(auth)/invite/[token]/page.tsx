import { auth } from '@/lib/auth';
import { InvitationAcceptClient } from '@/components/team/invitation-accept-client';

interface PageProps {
  params: Promise<{ token: string }>;
}

async function getInvitationData(token: string) {
  try {
    // Use absolute URL for server-side fetch
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/invitations/${token}`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.json();
      return { data: null, error: error.error || 'Invalid invitation' };
    }

    const data = await response.json();
    return { data, error: null };
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
