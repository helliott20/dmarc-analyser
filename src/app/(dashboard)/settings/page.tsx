import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { users, accounts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ProfileForm } from '@/components/settings/profile-form';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Calendar, Link as LinkIcon } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

async function getUserWithAccounts(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      image: users.image,
      emailVerified: users.emailVerified,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId));

  if (!user) return null;

  // Get linked accounts
  const linkedAccounts = await db
    .select({
      provider: accounts.provider,
      providerAccountId: accounts.providerAccountId,
      type: accounts.type,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId));

  return { ...user, linkedAccounts };
}

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userData = await getUserWithAccounts(session.user.id);

  if (!userData) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Profile</h2>
        <p className="text-sm text-muted-foreground">
          Manage your personal information and account details
        </p>
      </div>

      {/* Profile Overview */}
      <div className="flex items-start gap-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={userData.image || ''} alt={userData.name || ''} />
          <AvatarFallback className="text-2xl">
            {userData.name?.charAt(0) || userData.email?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <h3 className="text-lg font-semibold">{userData.name || 'No name set'}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Mail className="h-4 w-4" />
            {userData.email}
            {userData.emailVerified && (
              <Badge variant="secondary" className="ml-1">
                Verified
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            Joined {formatDistanceToNow(new Date(userData.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>

      {/* Edit Profile Form */}
      <ProfileForm user={userData} />

      {/* Linked Accounts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Linked Accounts
          </CardTitle>
          <CardDescription>
            Accounts connected to your DMARC Analyser profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          {userData.linkedAccounts.length > 0 ? (
            <div className="space-y-3">
              {userData.linkedAccounts.map((account, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      {account.provider === 'google' && (
                        <svg className="h-5 w-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                      )}
                    </div>
                    <div>
                      <p className="font-medium capitalize">{account.provider}</p>
                      <p className="text-sm text-muted-foreground">
                        Connected via {account.type}
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No accounts linked</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
