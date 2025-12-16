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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3 } from 'lucide-react';

interface DailyData {
  date: string;
  total: number;
  passed: number;
  failed: number;
}

interface DomainData {
  domainId: string;
  domain: string;
  total: number;
  passed: number;
  failed: number;
  passRate: number;
}

interface TimelineResponse {
  daily: DailyData[];
  byDomain: DomainData[];
  summary: {
    totalMessages: number;
    passedMessages: number;
    failedMessages: number;
    passRate: number;
  };
}

interface DailyVolumeChartProps {
  orgSlug: string;
}

// Semantic colors that represent pass/fail universally
const CHART_COLORS = {
  passed: '#22c55e', // Green - success
  failed: '#ef4444', // Red - failure
};

// Custom tooltip component for better styling
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const total = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const passed = payload.find((p) => p.dataKey === 'passed')?.value || 0;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="bg-popover border border-border rounded-lg shadow-lg p-3 min-w-[160px]">
      <p className="font-medium text-sm mb-2">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-muted-foreground">{entry.name}</span>
            </div>
            <span className="text-sm font-medium tabular-nums">
              {entry.value.toLocaleString()}
            </span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 mt-1.5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-sm font-medium tabular-nums">
              {total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pass Rate</span>
            <span className="text-sm font-medium tabular-nums">{passRate}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DailyVolumeChart({ orgSlug }: DailyVolumeChartProps) {
  const [data, setData] = useState<TimelineResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('7');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/orgs/${orgSlug}/dashboard/timeline?days=${days}`
        );
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error('Failed to fetch timeline data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgSlug, days]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Daily Message Volume
            </CardTitle>
            <CardDescription>Passed vs failed messages over time</CardDescription>
          </div>
          <Skeleton className="h-9 w-[130px]" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[280px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || data.daily.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Daily Message Volume
            </CardTitle>
            <CardDescription>Passed vs failed messages over time</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[280px] text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground">
              No data available for the selected time range.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Import DMARC reports to see daily volume charts.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format dates for display
  const chartData = data.daily.map((d) => ({
    ...d,
    dateLabel: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
  }));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Daily Message Volume
          </CardTitle>
          <CardDescription>Passed vs failed messages over time</CardDescription>
        </div>
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="14">Last 14 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                className="stroke-muted"
              />
              <XAxis
                dataKey="dateLabel"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) =>
                  value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value
                }
                width={45}
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
                radius={[0, 0, 0, 0]}
              />
              <Bar
                dataKey="failed"
                name="Failed"
                stackId="a"
                fill={CHART_COLORS.failed}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
