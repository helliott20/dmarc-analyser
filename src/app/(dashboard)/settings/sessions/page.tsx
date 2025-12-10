import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { SessionsClient } from '@/components/settings/sessions-client';
import { headers } from 'next/headers';

async function getUserSessions(userId: string) {
  const userSessions = await db
    .select({
      sessionToken: sessions.sessionToken,
      expires: sessions.expires,
    })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .orderBy(desc(sessions.expires));

  return userSessions;
}

export default async function SessionsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userSessions = await getUserSessions(session.user.id);

  // Get current session token from cookies
  const headersList = await headers();
  const cookieHeader = headersList.get('cookie') || '';

  // Extract session token from cookies (NextAuth uses __Secure-authjs.session-token or authjs.session-token)
  const sessionTokenMatch = cookieHeader.match(/(?:__Secure-)?authjs\.session-token=([^;]+)/);
  const currentSessionToken = sessionTokenMatch ? sessionTokenMatch[1] : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Active Sessions</h2>
        <p className="text-sm text-muted-foreground">
          Manage your active sessions across devices
        </p>
      </div>

      <SessionsClient
        sessions={userSessions}
        currentSessionToken={currentSessionToken}
      />
    </div>
  );
}
