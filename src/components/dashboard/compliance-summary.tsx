'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, CheckCircle2, XCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComplianceSummaryProps {
  orgSlug: string;
}

interface SummaryData {
  totalMessages: number;
  passedMessages: number;
  failedMessages: number;
  passRate: number;
}

interface TimelineResponse {
  summary: SummaryData;
  daily: Array<{ date: string; passed: number; failed: number; total: number }>;
}

export function ComplianceSummary({ orgSlug }: ComplianceSummaryProps) {
  const [currentData, setCurrentData] = useState<TimelineResponse | null>(null);
  const [previousData, setPreviousData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch current 7 days
        const currentRes = await fetch(
          `/api/orgs/${orgSlug}/dashboard/timeline?days=7`
        );
        // Fetch previous 7 days (days 8-14)
        const previousRes = await fetch(
          `/api/orgs/${orgSlug}/dashboard/timeline?days=14`
        );

        if (currentRes.ok) {
          const json = await currentRes.json();
          setCurrentData(json);
        }

        if (previousRes.ok) {
          const json = await previousRes.json();
          // Calculate previous period by subtracting current from 14-day total
          if (currentData) {
            const prevTotal = json.summary.totalMessages - (currentData?.summary.totalMessages || 0);
            const prevPassed = json.summary.passedMessages - (currentData?.summary.passedMessages || 0);
            setPreviousData({
              ...json,
              summary: {
                totalMessages: prevTotal,
                passedMessages: prevPassed,
                failedMessages: prevTotal - prevPassed,
                passRate: prevTotal > 0 ? Math.round((prevPassed / prevTotal) * 100) : 0,
              },
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch compliance summary:', error);
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
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            DMARC Compliance
          </CardTitle>
          <CardDescription>7-day authentication summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!currentData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            DMARC Compliance
          </CardTitle>
          <CardDescription>7-day authentication summary</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Shield className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No compliance data available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { summary } = currentData;
  const passRate = summary.passRate;

  // Determine compliance status
  const getComplianceStatus = (rate: number) => {
    if (rate >= 95) return { label: 'Excellent', color: 'text-success', bgColor: 'bg-success/10' };
    if (rate >= 80) return { label: 'Good', color: 'text-success', bgColor: 'bg-success/10' };
    if (rate >= 60) return { label: 'Fair', color: 'text-warning', bgColor: 'bg-warning/10' };
    return { label: 'Needs Attention', color: 'text-destructive', bgColor: 'bg-destructive/10' };
  };

  const status = getComplianceStatus(passRate);

  // Calculate trend (comparing to previous period if available)
  const previousPassRate = previousData?.summary.passRate || 0;
  const trend = passRate - previousPassRate;
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
  const trendColor = trend > 0 ? 'text-success' : trend < 0 ? 'text-destructive' : 'text-muted-foreground';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          DMARC Compliance
        </CardTitle>
        <CardDescription>7-day authentication summary</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Pass Rate Display */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{passRate}</span>
              <span className="text-2xl text-muted-foreground">%</span>
            </div>
            <p className={cn('text-sm font-medium', status.color)}>{status.label}</p>
          </div>
          {previousData && (
            <div className={cn('flex items-center gap-1', trendColor)}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium tabular-nums">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>

        {/* Progress bar visualization */}
        <div className="space-y-2">
          <div className="relative h-4 rounded-full overflow-hidden bg-destructive/20">
            <div
              className="absolute inset-y-0 left-0 bg-success transition-all duration-500"
              style={{ width: `${passRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Passed/Failed breakdown */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <p className="text-lg font-bold tabular-nums text-success">
                {summary.passedMessages.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Passed</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-lg font-bold tabular-nums text-destructive">
                {summary.failedMessages.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Failed</p>
            </div>
          </div>
        </div>

        {/* Total messages */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Total Messages</span>
          <span className="text-sm font-medium tabular-nums">
            {summary.totalMessages.toLocaleString()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
