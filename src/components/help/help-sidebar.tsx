'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  BookMarked,
  Compass,
  HelpCircle,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface HelpSection {
  title: string;
  items: {
    title: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}

const helpSections: HelpSection[] = [
  {
    title: 'Getting Started',
    items: [
      {
        title: 'Quick Start Guide',
        href: '/help/getting-started',
        icon: Compass,
      },
    ],
  },
  {
    title: 'DMARC Fundamentals',
    items: [
      {
        title: 'DMARC Basics',
        href: '/help/dmarc-basics',
        icon: BookOpen,
      },
      {
        title: 'Understanding Reports',
        href: '/help/understanding-reports',
        icon: BarChart3,
      },
      {
        title: 'Glossary',
        href: '/help/glossary',
        icon: BookMarked,
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        title: 'Troubleshooting',
        href: '/help/troubleshooting',
        icon: AlertCircle,
      },
    ],
  },
];

export function HelpSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 flex-shrink-0">
      <nav className="space-y-6">
        <div>
          <Link
            href="/help"
            className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors"
          >
            <HelpCircle className="h-5 w-5" />
            Help Center
          </Link>
        </div>

        {helpSections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                      isActive
                        ? 'bg-muted font-medium text-foreground'
                        : 'text-muted-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
