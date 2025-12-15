'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Forward,
  AlertCircle,
} from 'lucide-react';

export type SourceFilter = 'all' | 'legitimate' | 'suspicious' | 'unknown' | 'forwarded' | 'failing';

interface FilterCounts {
  all: number;
  legitimate: number;
  suspicious: number;
  unknown: number;
  forwarded: number;
  failing: number;
}

interface SourcesFilterBarProps {
  counts: FilterCounts;
}

const FILTER_OPTIONS: {
  value: SourceFilter;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeColor: string;
}[] = [
  {
    value: 'all',
    label: 'All',
    icon: () => null,
    activeColor: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300',
  },
  {
    value: 'legitimate',
    label: 'Legitimate',
    icon: CheckCircle2,
    activeColor: 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    value: 'suspicious',
    label: 'Suspicious',
    icon: XCircle,
    activeColor: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
  {
    value: 'unknown',
    label: 'Unknown',
    icon: AlertTriangle,
    activeColor: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  {
    value: 'forwarded',
    label: 'Forwarded',
    icon: Forward,
    activeColor: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    value: 'failing',
    label: 'Failing',
    icon: AlertCircle,
    activeColor: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400',
  },
];

export function SourcesFilterBar({ counts }: SourcesFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get('filter') as SourceFilter) || 'all';

  const setFilter = (filter: SourceFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    if (filter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', filter);
    }
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  };

  return (
    <div className="flex flex-wrap gap-2">
      {FILTER_OPTIONS.map((option) => {
        const count = counts[option.value];
        const isActive = currentFilter === option.value;
        const Icon = option.icon;

        // Skip filters with 0 count (except 'all')
        if (count === 0 && option.value !== 'all') {
          return null;
        }

        return (
          <Button
            key={option.value}
            variant="ghost"
            size="sm"
            onClick={() => setFilter(option.value)}
            className={cn(
              'rounded-full px-4 py-1 h-8 transition-colors',
              isActive ? option.activeColor : 'bg-muted hover:bg-muted/80'
            )}
          >
            {Icon && <Icon className="h-3 w-3 mr-1.5" />}
            {option.label}
            <Badge
              variant="secondary"
              className={cn(
                'ml-2 h-5 px-1.5 text-xs',
                isActive && 'bg-white/50 dark:bg-black/20'
              )}
            >
              {count}
            </Badge>
          </Button>
        );
      })}
    </div>
  );
}
