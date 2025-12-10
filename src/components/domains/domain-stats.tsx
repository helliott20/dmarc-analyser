'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Shield,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DomainStatsProps {
  orgSlug: string;
  domainId: string;
  initialStats: {
    reportsLast30Days: number;
    totalMessages: number;
    passRate: number;
  };
}

interface Stats {
  reportsLast30Days: number;
  reportsAllTime: number;
  totalMessages: number;
  totalMessagesAllTime: number;
  passedMessages: number;
  passedMessagesAllTime: number;
  passRate: number;
  passRateAllTime: number;
  isSyncing: boolean;
}

function PulsingDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-2 w-2', className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success/40 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
    </span>
  );
}

export function DomainStats({ orgSlug, domainId, initialStats }: DomainStatsProps) {
  const [stats, setStats] = useState<Stats>({
    ...initialStats,
    reportsAllTime: 0,
    totalMessagesAllTime: 0,
    passedMessages: 0,
    passedMessagesAllTime: 0,
    passRateAllTime: 0,
    isSyncing: false,
  });
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/domains/${domainId}/stats`
        );
        if (response.ok && isMounted) {
          const data = await response.json();
          setStats(data);
          setIsLive(true);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
        if (isMounted) setIsLive(false);
      }
    };

    // Initial fetch
    fetchStats();

    // Set up polling every 5 seconds
    const pollInterval = setInterval(fetchStats, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [orgSlug, domainId]);

  return (
    <div className="space-y-4">
      {/* Live indicator */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {isLive ? (
          <>
            <PulsingDot />
            <span>Live updates enabled</span>
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-gray-300" />
            <span>Connecting...</span>
          </>
        )}
        {stats.isSyncing && (
          <span className="flex items-center gap-1 text-primary ml-4">
            <Loader2 className="h-3 w-3 animate-spin" />
            Gmail sync in progress
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Reports (30 days)
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reportsLast30Days}</div>
            <p className="text-xs text-muted-foreground">
              {stats.reportsAllTime > 0 && `${stats.reportsAllTime} all time`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Messages
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalMessages.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                / {stats.totalMessagesAllTime.toLocaleString()} total
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Last 30 days / all time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DMARC Pass Rate</CardTitle>
            {stats.passRate >= 90 ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : stats.passRate >= 70 ? (
              <AlertTriangle className="h-4 w-4 text-warning" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-destructive" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.passRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.passRate >= 90
                ? 'Excellent compliance'
                : stats.passRate >= 70
                ? 'Needs improvement'
                : 'Critical issues detected'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
