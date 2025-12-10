'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { User, Monitor, Bell, Shield } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';

const iconMap = {
  user: User,
  monitor: Monitor,
  bell: Bell,
  shield: Shield,
} as const;

type IconName = keyof typeof iconMap;

interface NavItem {
  title: string;
  href: string;
  icon: IconName;
}

interface SettingsSidebarNavProps {
  items: NavItem[];
}

export function SettingsSidebarNav({ items }: SettingsSidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon];
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'justify-start gap-2',
              isActive
                ? 'bg-muted hover:bg-muted'
                : 'hover:bg-transparent hover:underline'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
