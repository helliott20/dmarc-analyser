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
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';

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

// Custom tooltip for volume charts showing detailed breakdown
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    payload: {
      date: string;
      passed: number;
      failed: number;
      total: number;
      passRate: number;
      none?: number;
      quarantine?: number;
      reject?: number;
    };
  }>;
  label?: string;
}

function VolumeTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const total = (data?.passed || 0) + (data?.failed || 0);
  const passRate = total > 0 ? Math.round((data.passed / total) * 100) : 0;

  // Determine color based on pass rate threshold
  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return CHART_COLORS.passed;
    if (rate >= 70) return CHART_COLORS.quarantine;
    return CHART_COLORS.failed;
  };

  return (
    <div className="bg-card text-card-foreground border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="font-medium text-sm mb-2 border-b pb-2">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.passed }} />
            Passed:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.passed }}>{data?.passed?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.failed }} />
            Failed:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.failed }}>{data?.failed?.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-1.5 mt-1.5">
          <span className="text-muted-foreground">Pass Rate:</span>
          <span className="font-bold" style={{ color: getPassRateColor(passRate) }}>
            {passRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

function DispositionTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const total = (data?.none || 0) + (data?.quarantine || 0) + (data?.reject || 0);

  return (
    <div className="bg-card text-card-foreground border rounded-lg shadow-lg p-3 min-w-[180px]">
      <p className="font-medium text-sm mb-2 border-b pb-2">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.none }} />
            Delivered:
          </span>
          <span className="font-medium">{data?.none?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.quarantine }} />
            Quarantined:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.quarantine }}>{data?.quarantine?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.reject }} />
            Rejected:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.failed }}>{data?.reject?.toLocaleString() || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for Pass Rate Trend line chart
interface PassRateTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: {
      date: string;
      passRate: number;
      total: number;
      passed: number;
      failed: number;
    };
  }>;
  label?: string;
}

function PassRateTooltip({ active, payload, label }: PassRateTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const passRate = data?.passRate ?? 0;

  // Determine color based on pass rate threshold
  const getPassRateColor = (rate: number) => {
    if (rate >= 90) return CHART_COLORS.passed;
    if (rate >= 70) return CHART_COLORS.quarantine;
    return CHART_COLORS.failed;
  };

  return (
    <div className="bg-card text-card-foreground border rounded-lg shadow-lg p-3 min-w-[160px]">
      <p className="font-medium text-sm mb-2 border-b pb-2">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Pass Rate:</span>
          <span className="font-bold" style={{ color: getPassRateColor(passRate) }}>
            {passRate}%
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{data?.total?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.passed }} />
            Passed:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.passed }}>{data?.passed?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.failed }} />
            Failed:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.failed }}>{data?.failed?.toLocaleString() || 0}</span>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for Email Disposition pie chart
interface DispositionPieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: {
      name: string;
      value: number;
      color: string;
    };
  }>;
}

function DispositionPieTooltip({ active, payload }: DispositionPieTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0];
  const name = data?.payload?.name || data?.name;
  const value = data?.value || 0;
  const color = data?.payload?.color;

  return (
    <div className="bg-card text-card-foreground border rounded-lg shadow-lg p-3 min-w-[140px]">
      <div className="flex items-center gap-2 mb-2 border-b pb-2">
        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
        <span className="font-medium text-sm">{name}</span>
      </div>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Count:</span>
          <span className="font-medium">{value.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Custom tooltip for Authentication Results bar chart
interface AuthTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    color: string;
    payload: {
      name: string;
      pass: number;
      fail: number;
    };
  }>;
  label?: string;
}

function AuthTooltip({ active, payload, label }: AuthTooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  const total = (data?.pass || 0) + (data?.fail || 0);
  const passRate = total > 0 ? Math.round((data.pass / total) * 100) : 0;

  return (
    <div className="bg-card text-card-foreground border rounded-lg shadow-lg p-3 min-w-[160px]">
      <p className="font-medium text-sm mb-2 border-b pb-2">{label}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{total.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.passed }} />
            Pass:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.passed }}>{data?.pass?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS.failed }} />
            Fail:
          </span>
          <span className="font-medium" style={{ color: CHART_COLORS.failed }}>{data?.fail?.toLocaleString() || 0}</span>
        </div>
        <div className="flex justify-between items-center border-t pt-1.5 mt-1.5">
          <span className="text-muted-foreground">Pass Rate:</span>
          <span className="font-bold" style={{ color: passRate >= 90 ? CHART_COLORS.passed : passRate >= 70 ? CHART_COLORS.quarantine : CHART_COLORS.failed }}>
            {passRate}%
          </span>
        </div>
      </div>
    </div>
  );
}

export function TimelineCharts({ orgSlug, domainId }: TimelineChartsProps) {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState('30');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [useCustom, setUseCustom] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let url = `/api/orgs/${orgSlug}/domains/${domainId}/timeline`;

        if (useCustom && customRange?.from && customRange?.to) {
          url += `?startDate=${customRange.from.toISOString()}&endDate=${customRange.to.toISOString()}`;
        } else if (days === 'all') {
          url += '?days=3650'; // ~10 years for "all time"
        } else {
          url += `?days=${days}`;
        }

        const response = await fetch(url);
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
  }, [orgSlug, domainId, days, customRange, useCustom]);

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      setUseCustom(true);
    } else {
      setUseCustom(false);
      setDays(value);
    }
  };

  const handleCustomRangeChange = (range: DateRange | undefined) => {
    setCustomRange(range);
    if (range?.from && range?.to) {
      setUseCustom(true);
    }
  };

  // Date selector component - always visible
  const dateSelector = (
    <div className="flex items-center justify-end gap-2">
      <Select
        value={useCustom ? 'custom' : days}
        onValueChange={handlePresetChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select time range" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Last 7 days</SelectItem>
          <SelectItem value="30">Last 30 days</SelectItem>
          <SelectItem value="90">Last 90 days</SelectItem>
          <SelectItem value="180">Last 6 months</SelectItem>
          <SelectItem value="365">Last year</SelectItem>
          <SelectItem value="all">All time</SelectItem>
          <SelectItem value="custom">Custom range...</SelectItem>
        </SelectContent>
      </Select>

      {useCustom && (
        <DateRangePicker
          value={customRange}
          onChange={handleCustomRangeChange}
        />
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        {dateSelector}
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!data || data.daily.length === 0) {
    return (
      <div className="space-y-6">
        {dateSelector}
        <div className="text-center py-12 text-muted-foreground">
          <p>No data available for the selected time range.</p>
          <p className="text-sm mt-2">Try selecting a longer time range or &quot;All time&quot;.</p>
        </div>
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
      {dateSelector}

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
                <Tooltip content={<VolumeTooltip />} />
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
                <Tooltip content={<PassRateTooltip />} />
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
                  <Tooltip content={<DispositionPieTooltip />} />
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
                  <Tooltip content={<AuthTooltip />} cursor={false} />
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
                <Tooltip content={<DispositionTooltip />} />
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
