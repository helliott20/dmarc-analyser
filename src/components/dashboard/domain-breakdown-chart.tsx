'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DomainData {
  domainId: string;
  domain: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface TimelineResponse {
  byDomain: DomainData[];
  summary: {
    totalMessages: number;
    passedMessages: number;
    failedMessages: number;
    passRate: number;
  };
}

interface DomainBreakdownChartProps {
  orgSlug: string;
}

// Semantic colors
const CHART_COLORS = {
  passed: '#22c55e',
  failed: '#ef4444',
};

// Get pass rate color class
function getPassRateColor(rate: number): string {
  if (rate >= 95) return 'text-success';
  if (rate >= 80) return 'text-warning';
  return 'text-destructive';
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: DomainData & { shortDomain: string };
    dataKey: string;
    name: string;
    value: number;
    color: string;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="font-medium text-sm mb-2 truncate max-w-[200px]">{data.domain}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: CHART_COLORS.passed }}
            />
            <span className="text-sm text-muted-foreground">Passed</span>
          </div>
          <span className="text-sm font-medium tabular-nums">
            {data.passed.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: CHART_COLORS.failed }}
            />
            <span className="text-sm text-muted-foreground">Failed</span>
          </div>
          <span className="text-sm font-medium tabular-nums">
            {data.failed.toLocaleString()}
          </span>
        </div>
        <div className="border-t border-border pt-1.5 mt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-sm font-medium tabular-nums">
              {data.total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pass Rate</span>
            <span className={cn('text-sm font-medium tabular-nums', getPassRateColor(data.passRate))}>
              {data.passRate}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DomainBreakdownChart({ orgSlug }: DomainBreakdownChartProps) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch 7 days of data for domain breakdown
        const res = await fetch(`/api/orgs/${orgSlug}/dashboard/timeline?days=7`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch domain breakdown:', error);
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
            <Globe className="h-4 w-4 text-primary" />
            Domain Breakdown
          </CardTitle>
          <CardDescription>7-day volume by domain</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.byDomain.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-4 w-4 text-primary" />
            Domain Breakdown
          </CardTitle>
          <CardDescription>7-day volume by domain</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <Globe className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No domain data available.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add domains and import DMARC reports to see breakdown.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Take top 8 domains by volume, shorten domain names for display
  const chartData = data.byDomain.slice(0, 8).map((d) => {
    // Truncate long domain names
    const shortDomain =
      d.domain.length > 15 ? d.domain.substring(0, 12) + '...' : d.domain;
    return {
      ...d,
      shortDomain,
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Domain Breakdown
        </CardTitle>
        <CardDescription>7-day volume by domain (top {chartData.length})</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
                className="stroke-muted"
              />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
              />
              <YAxis
                type="category"
                dataKey="shortDomain"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className="text-sm text-foreground">{value}</span>
                )}
              />
              <Bar
                dataKey="passed"
                name="Passed"
                stackId="a"
                fill={CHART_COLORS.passed}
              />
              <Bar
                dataKey="failed"
                name="Failed"
                stackId="a"
                fill={CHART_COLORS.failed}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
