'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Bell, AlertCircle, ListTodo } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickStatsProps {
  orgSlug: string;
}

interface StatsData {
  alertsCount: number;
  issuesCount: number;
  tasksCount: number;
}

export function QuickStats({ orgSlug }: QuickStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch alerts count
        const alertsRes = await fetch(`/api/orgs/${orgSlug}/alerts`);
        let alertsCount = 0;
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          alertsCount = alertsData.filter?.((a: { dismissed: boolean }) => !a.dismissed)?.length || 0;
        }

        // For now, we'll derive issues and tasks from domain stats
        // Issues = domains with no DMARC record or failing checks
        // Tasks = domains pending verification
        const domainsRes = await fetch(`/api/orgs/${orgSlug}/domains`);
        let issuesCount = 0;
        let tasksCount = 0;
        if (domainsRes.ok) {
          const domainsData = await domainsRes.json();
          if (Array.isArray(domainsData)) {
            tasksCount = domainsData.filter((d: { verifiedAt: Date | null }) => !d.verifiedAt).length;
            // We'll need to fetch DNS status to count issues, for now estimate based on unverified domains
            issuesCount = tasksCount; // Pending verification = potential issues
          }
        }

        setStats({
          alertsCount,
          issuesCount,
          tasksCount,
        });
      } catch (error) {
        console.error('Failed to fetch quick stats:', error);
        setStats({
          alertsCount: 0,
          issuesCount: 0,
          tasksCount: 0,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: 'Alerts',
      value: stats?.alertsCount || 0,
      icon: Bell,
      href: `/orgs/${orgSlug}/alerts`,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
    {
      label: 'Tasks',
      value: stats?.tasksCount || 0,
      icon: ListTodo,
      href: `/orgs/${orgSlug}/domains`,
      color: 'text-info',
      bgColor: 'bg-info/10',
    },
    {
      label: 'Issues',
      value: stats?.issuesCount || 0,
      icon: AlertCircle,
      href: `/orgs/${orgSlug}/domains`,
      color: 'text-destructive',
      bgColor: 'bg-destructive/10',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-3 animate-content-enter-stagger">
      {items.map((item) => (
        <Link key={item.label} href={item.href}>
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-full', item.bgColor)}>
                  <item.icon className={cn('h-4 w-4', item.color)} />
                </div>
                <div>
                  <p className="text-2xl font-bold tabular-nums">{item.value}</p>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
