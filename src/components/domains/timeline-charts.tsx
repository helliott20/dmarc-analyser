'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { Loader2 } from 'lucide-react';

interface DailyData {
  date: string;
  total: number;
  passed: number;
  failed: number;
  none: number;
  quarantine: number;
  reject: number;
}

interface TimelineData {
  daily: DailyData[];
  disposition: {
    none: number;
    quarantine: number;
    reject: number;
  };
  authentication: {
    dkimPass: number;
    dkimFail: number;
    spfPass: number;
    spfFail: number;
  };
  summary: {
    totalMessages: number;
    passedMessages: number;
    failedMessages: number;
    passRate: number;
  };
}

interface TimelineChartsProps {
  orgSlug: string;
  domainId: string;
}

// Fixed semantic colors for charts - these should NOT change with theme
// as they represent universal meanings (green=good, red=bad, etc.)
const CHART_COLORS = {
  passed: '#22c55e',      // Green - success/pass
  failed: '#ef4444',      // Red - failure/reject
  none: '#3b82f6',        // Blue - delivered/none
  quarantine: '#f59e0b',  // Amber - warning/quarantine
  reject: '#ef4444',      // Red - rejected
  dkim: '#8b5cf6',        // Purple - DKIM
  spf: '#06b6d4',         // Cyan - SPF
};

export function TimelineCharts({ orgSlug, domainId }: TimelineChartsProps) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');


  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/domains/${domainId}/timeline?days=${days}`
        );
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch timeline data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgSlug, domainId, days]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.daily.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No data available for the selected time range.</p>
        <p className="text-sm mt-2">Import some DMARC reports to see charts.</p>
      </div>
    );
  }

  // Format data for charts
  const chartData = data.daily.map(d => ({
    ...d,
    date: new Date(d.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    passRate: d.total > 0 ? Math.round((d.passed / d.total) * 100) : 0,
  }));

  const dispositionData = [
    { name: 'Delivered', value: data.disposition.none, color: CHART_COLORS.none },
    { name: 'Quarantined', value: data.disposition.quarantine, color: CHART_COLORS.quarantine },
    { name: 'Rejected', value: data.disposition.reject, color: CHART_COLORS.reject },
  ].filter(d => d.value > 0);

  const authData = [
    { name: 'DKIM', pass: data.authentication.dkimPass, fail: data.authentication.dkimFail },
    { name: 'SPF', pass: data.authentication.spfPass, fail: data.authentication.spfFail },
  ];

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-end">
        <Select value={days} onValueChange={setDays}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 6 months</SelectItem>
            <SelectItem value="365">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalMessages.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Passed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {data.summary.passedMessages.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {data.summary.failedMessages.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pass Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.passRate}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Volume Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Message Volume & Compliance</CardTitle>
          <CardDescription>
            Daily email volume with pass/fail breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), '']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="passed"
                  name="Passed"
                  stackId="1"
                  stroke={CHART_COLORS.passed}
                  fill={CHART_COLORS.passed}
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name="Failed"
                  stackId="1"
                  stroke={CHART_COLORS.failed}
                  fill={CHART_COLORS.failed}
                  fillOpacity={0.6}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pass Rate Trend */}
      <Card>
        <CardHeader>
          <CardTitle>DMARC Pass Rate Trend</CardTitle>
          <CardDescription>
            Percentage of emails passing DMARC authentication over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [`${value}%`, 'Pass Rate']}
                />
                <Line
                  type="monotone"
                  dataKey="passRate"
                  name="Pass Rate"
                  stroke={CHART_COLORS.passed}
                  strokeWidth={2}
                  dot={{ fill: CHART_COLORS.passed, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: CHART_COLORS.passed }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Bottom Row - Disposition and Authentication */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Disposition Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Email Disposition</CardTitle>
            <CardDescription>
              How email providers handled your messages
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={dispositionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {dispositionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [
                      value.toLocaleString(),
                      'Messages',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              {dispositionData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {item.name}: {item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Authentication Results */}
        <Card>
          <CardHeader>
            <CardTitle>Authentication Results</CardTitle>
            <CardDescription>DKIM and SPF pass/fail breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={authData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                    width={50}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '6px',
                    }}
                    formatter={(value: number) => [value.toLocaleString(), '']}
                  />
                  <Legend />
                  <Bar dataKey="pass" name="Pass" fill={CHART_COLORS.passed} stackId="a" />
                  <Bar dataKey="fail" name="Fail" fill={CHART_COLORS.failed} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Disposition Over Time */}
      <Card>
        <CardHeader>
          <CardTitle>Disposition Over Time</CardTitle>
          <CardDescription>
            Daily breakdown of how emails were handled
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => value.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '6px',
                  }}
                  formatter={(value: number) => [value.toLocaleString(), '']}
                />
                <Legend />
                <Bar dataKey="none" name="Delivered" stackId="a" fill={CHART_COLORS.none} />
                <Bar dataKey="quarantine" name="Quarantined" stackId="a" fill={CHART_COLORS.quarantine} />
                <Bar dataKey="reject" name="Rejected" stackId="a" fill={CHART_COLORS.reject} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
