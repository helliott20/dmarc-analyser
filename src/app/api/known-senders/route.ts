import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { knownSenders } from '@/db/schema';
import { eq, or, and, isNull } from 'drizzle-orm';

/**
 * GET /api/known-senders
 * Fetch all global known senders (available to all users)
 */
export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch only global known senders
    const globalSenders = await db
      .select()
      .from(knownSenders)
      .where(eq(knownSenders.isGlobal, true))
      .orderBy(knownSenders.name);

    return NextResponse.json(globalSenders);
  } catch (error) {
    console.error('Failed to fetch known senders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch known senders' },
      { status: 500 }
    );
  }
}
