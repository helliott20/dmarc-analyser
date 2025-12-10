import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { sessions } from '@/db/schema';
import { eq, and, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current session token from cookies
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('authjs.session-token') || cookieStore.get('__Secure-authjs.session-token');
    const currentSessionToken = sessionCookie?.value;

    if (!currentSessionToken) {
      return NextResponse.json(
        { error: 'Could not identify current session' },
        { status: 400 }
      );
    }

    // Delete all sessions for this user except the current one
    await db
      .delete(sessions)
      .where(
        and(
          eq(sessions.userId, session.user.id),
          ne(sessions.sessionToken, currentSessionToken)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking sessions:', error);
    return NextResponse.json(
      { error: 'Failed to revoke sessions' },
      { status: 500 }
    );
  }
}
