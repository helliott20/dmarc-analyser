import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { userPreferences } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { AppearanceForm } from '@/components/settings/appearance-form';

async function getUserPreferences(userId: string) {
  const [prefs] = await db
    .select()
    .from(userPreferences)
    .where(eq(userPreferences.userId, userId));

  // If no preferences exist, create default ones
  if (!prefs) {
    const [newPrefs] = await db
      .insert(userPreferences)
      .values({
        userId,
        emailLoginAlerts: true,
        emailWeeklyDigest: true,
        emailAlertNotifications: true,
        theme: 'system',
      })
      .returning();

    return newPrefs;
  }

  return prefs;
}

export default async function AppearancePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const preferences = await getUserPreferences(session.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Appearance</h2>
        <p className="text-sm text-muted-foreground">
          Customize how the application looks for you
        </p>
      </div>

      <AppearanceForm preferences={preferences} />
    </div>
  );
}
