import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/db';
import { users, accounts, sessions, verificationTokens, orgMembers, organizations } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // Redirect to /orgs after sign in
      if (url === baseUrl || url === `${baseUrl}/`) {
        // Check if user has any organizations
        try {
          const session = await auth();
          if (session?.user?.id) {
            const memberships = await db
              .select()
              .from(orgMembers)
              .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
              .where(eq(orgMembers.userId, session.user.id))
              .limit(1);

            // If no organizations, redirect to onboarding
            if (memberships.length === 0) {
              return `${baseUrl}/onboarding`;
            }
          }
        } catch (error) {
          console.error('Failed to check user organizations:', error);
        }

        return `${baseUrl}/orgs`;
      }
      // Allow relative URLs
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      // Allow URLs on the same origin
      if (new URL(url).origin === baseUrl) {
        return url;
      }
      return baseUrl;
    },
  },
  session: {
    strategy: 'database',
  },
  trustHost: true,
});
