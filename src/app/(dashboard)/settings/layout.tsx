import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { SettingsSidebarNav } from '@/components/settings/settings-sidebar-nav';

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const settingsNav = [
    {
      title: 'Profile',
      href: '/settings',
      icon: 'user' as const,
    },
    {
      title: 'Sessions',
      href: '/settings/sessions',
      icon: 'shield' as const,
    },
    {
      title: 'Notifications',
      href: '/settings/notifications',
      icon: 'bell' as const,
    },
    {
      title: 'Appearance',
      href: '/settings/appearance',
      icon: 'monitor' as const,
    },
  ];

  return (
    <div className="space-y-6 w-full">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal account settings and preferences
        </p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Sidebar Navigation */}
        <aside className="lg:w-56 flex-shrink-0">
          <SettingsSidebarNav items={settingsNav} />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 max-w-full">
          <Card className="p-6">{children}</Card>
        </div>
      </div>
    </div>
  );
}
