import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const preferencesUpdateSchema = z.object({
  emailLoginAlerts: z.boolean().optional(),
  emailWeeklyDigest: z.boolean().optional(),
  emailAlertNotifications: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = preferencesUpdateSchema.parse(body);

    // Check if preferences exist
    const [existingPrefs] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, session.user.id));

    if (!existingPrefs) {
      // Create new preferences
      await db.insert(userPreferences).values({
        userId: session.user.id,
        emailLoginAlerts: validatedData.emailLoginAlerts ?? true,
        emailWeeklyDigest: validatedData.emailWeeklyDigest ?? true,
        emailAlertNotifications: validatedData.emailAlertNotifications ?? true,
        theme: validatedData.theme ?? 'system',
      });
    } else {
      // Update existing preferences
      await db
        .update(userPreferences)
        .set({
          ...validatedData,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, session.user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update preferences' },
      { status: 500 }
    );
  }
}
