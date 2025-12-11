import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/app-sidebar';
import { Separator } from '@/components/ui/separator';
import { CommandMenu } from '@/components/dashboard/command-menu';
import { OrgThemeProvider } from '@/components/branding/org-theme-provider';
import { HelpWidget } from '@/components/help/help-widget';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function getUserOrganizations(userId: string) {
  const memberships = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      logoUrl: organizations.logoUrl,
      faviconUrl: organizations.faviconUrl,
      primaryColor: organizations.primaryColor,
      accentColor: organizations.accentColor,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(eq(orgMembers.userId, userId));

  return memberships;
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userOrgs = await getUserOrganizations(session.user.id);

  const currentOrg = userOrgs[0] || null;

  return (
    <OrgThemeProvider
      organizations={userOrgs}
      primaryColor={currentOrg?.primaryColor}
      accentColor={currentOrg?.accentColor}
      faviconUrl={currentOrg?.faviconUrl}
    >
      <SidebarProvider>
        <AppSidebar
          organizations={userOrgs}
          currentOrg={currentOrg}
        />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1" />
            <CommandMenu />
          </header>
          <main className="flex flex-1 flex-col overflow-auto p-6 w-full">
            <div className="w-full max-w-full">
              {children}
            </div>
            <HelpWidget />
          </main>
        </SidebarInset>
      </SidebarProvider>
    </OrgThemeProvider>
  );
}
