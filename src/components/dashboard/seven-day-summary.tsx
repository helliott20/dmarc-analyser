'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe,
  GlobeLock,
  Shield,
  ArrowRightLeft,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SummaryData {
  activeDomains: number;
  inactiveDomains: number;
  totalMessages7d: number;
  passedMessages7d: number;
  failedMessages7d: number;
  passRate7d: number;
  dmarcCapablePercent: number;
  forwardedPercent: number;
  threatPercent: number;
}

interface SevenDaySummaryProps {
  orgSlug: string;
}

export function SevenDaySummary({ orgSlug }: SevenDaySummaryProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/domains/stats`);
        if (res.ok) {
          const json = await res.json();
          setData(json.summary);
        }
      } catch (error) {
        console.error('Failed to fetch summary:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgSlug]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">7 Day Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">7 Day Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Domain Activity Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-success/10">
              <Globe className="h-4 w-4 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.activeDomains}</p>
              <p className="text-xs text-muted-foreground">Active Domains</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-muted">
              <GlobeLock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="text-2xl font-bold">{data.inactiveDomains}</p>
              <p className="text-xs text-muted-foreground">Inactive Domains</p>
            </div>
          </div>
        </div>

        {/* Message Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Message Breakdown</span>
            <span className="text-muted-foreground tabular-nums">
              {data.totalMessages7d.toLocaleString()} total
            </span>
          </div>

          {/* DMARC Capable */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-success" />
                <span>DMARC Capable</span>
              </div>
              <span className="font-medium tabular-nums">{data.dmarcCapablePercent}%</span>
            </div>
            <Progress value={data.dmarcCapablePercent} className="h-2" />
          </div>

          {/* Forwarded */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-3.5 w-3.5 text-info" />
                <span>Forwarded</span>
              </div>
              <span className="font-medium tabular-nums">{data.forwardedPercent}%</span>
            </div>
            <Progress
              value={data.forwardedPercent}
              className={cn('h-2', '[&>div]:bg-info')}
            />
          </div>

          {/* Threat/Unknown */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                <span>Threat/Unknown</span>
              </div>
              <span className="font-medium tabular-nums">{data.threatPercent}%</span>
            </div>
            <Progress
              value={data.threatPercent}
              className={cn('h-2', '[&>div]:bg-warning')}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
