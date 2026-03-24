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
    activeColor: 'bg-success/15 text-success hover:bg-success/20',
  },
  {
    value: 'suspicious',
    label: 'Suspicious',
    icon: XCircle,
    activeColor: 'bg-destructive/15 text-destructive hover:bg-destructive/15',
  },
  {
    value: 'unknown',
    label: 'Unknown',
    icon: AlertTriangle,
    activeColor: 'bg-warning/15 text-warning hover:bg-warning/15',
  },
  {
    value: 'forwarded',
    label: 'Forwarded',
    icon: Forward,
    activeColor: 'bg-info/15 text-info hover:bg-info/15',
  },
  {
    value: 'failing',
    label: 'Failing',
    icon: AlertCircle,
    activeColor: 'bg-destructive/15 text-destructive hover:bg-destructive/15',
  },
];

export function SourcesFilterBar({ counts }: SourcesFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentFilter = (searchParams.get('filter') as SourceFilter) || 'all';

  const setFilter = (filter: SourceFilter) => {
    // Clicking the active filter toggles back to "All"
    const targetFilter = filter === currentFilter && filter !== 'all' ? 'all' : filter;

    const params = new URLSearchParams(searchParams.toString());
    if (targetFilter === 'all') {
      params.delete('filter');
    } else {
      params.set('filter', targetFilter);
    }
    const queryString = params.toString();
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(url);
    router.refresh();
  };

  return (
    <div className="flex flex-wrap gap-1.5 sm:gap-2 overflow-x-auto">
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
              'rounded-full px-3 sm:px-4 py-1 h-7 sm:h-8 text-xs sm:text-sm transition-colors',
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
