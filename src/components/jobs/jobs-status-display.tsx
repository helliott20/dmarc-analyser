'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Zap,
  ShieldCheck,
  ShieldAlert,
  Pause,
} from 'lucide-react';
import { toast } from 'sonner';

interface RepeatableJob {
  key: string;
  name: string;
  pattern: string;
  next: number | null;
}

interface FailedJob {
  id: string;
  name: string;
  failedReason: string;
  timestamp: number;
  attemptsMade: number;
}

interface CompletedJobInfo {
  id: string;
  name: string;
  timestamp: number;
  returnvalue?: unknown;
}

interface QueueStatus {
  name: string;
  displayName: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: boolean;
  repeatableJobs: RepeatableJob[];
  recentFailedJobs: FailedJob[];
  lastCompletedJob: CompletedJobInfo | null;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'critical';
  message: string;
  totalActive: number;
  totalWaiting: number;
  totalCompleted: number;
  totalFailed: number;
}

interface JobsData {
  queues: QueueStatus[];
  health: HealthStatus;
  timestamp: string;
}

interface JobsStatusDisplayProps {
  orgSlug: string;
}

export function JobsStatusDisplay({ orgSlug }: JobsStatusDisplayProps) {
  const [data, setData] = useState<JobsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/jobs`);

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to fetch job status');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [orgSlug]);

  // Check if there are active jobs that warrant faster polling
  const hasActiveJobs = data?.queues.some(q => q.active > 0 || q.waiting > 0);

  useEffect(() => {
    fetchData();

    // Poll faster (3s) when there are active/waiting jobs, slower (10s) when idle
    const interval = setInterval(() => {
      fetchData();
    }, hasActiveJobs ? 3000 : 10000);

    return () => clearInterval(interval);
  }, [orgSlug, fetchData, hasActiveJobs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/jobs`);

      if (!response.ok) {
        throw new Error('Failed to fetch job status');
      }

      const result = await response.json();
      setData(result);
      setError(null);
      toast.success('Job status refreshed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      toast.error('Failed to refresh job status');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearGmailSync = async () => {
    if (!confirm('Are you sure you want to clear the Gmail sync queue? This will stop any running syncs.')) {
      return;
    }

    setIsClearing(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/jobs`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to clear Gmail sync queue');
      }

      toast.success('Gmail sync queue cleared');
      fetchData(); // Refresh the data
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear queue');
    } finally {
      setIsClearing(false);
    }
  };

  const formatNextRun = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff < 0) return 'Overdue';

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'Less than 1 minute';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;

    return date.toLocaleDateString();
  };

  const formatCronPattern = (pattern: string) => {
    const patterns: Record<string, string> = {
      '*/15 * * * *': 'Every 15 minutes',
      '0 */6 * * *': 'Every 6 hours',
      '0 * * * *': 'Every hour',
      '0 2 * * *': 'Daily at 2am',
    };

    return patterns[pattern] || pattern;
  };

  const formatLastRun = (timestamp: number | null | undefined) => {
    if (!timestamp) return 'Never';

    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString();
  };

  const truncateError = (error: string, maxLength: number = 100) => {
    if (error.length <= maxLength) return error;
    return error.substring(0, maxLength) + '...';
  };

  const getQueueHealthStatus = (queue: QueueStatus) => {
    if (queue.paused) return 'paused';
    if (queue.failed > 10) return 'critical';
    if (queue.failed > 0) return 'warning';
    if (queue.active > 0) return 'active';
    return 'healthy';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Active
          </Badge>
        );
      case 'paused':
        return (
          <Badge variant="secondary">
            <Pause className="h-3 w-3 mr-1" />
            Paused
          </Badge>
        );
      case 'warning':
        return (
          <Badge variant="outline" className="border-yellow-500 text-yellow-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Warning
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Critical
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-green-500 text-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Healthy
          </Badge>
        );
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={handleRefresh} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Separate queues with repeatable jobs (recurring) from one-time queues
  const recurringQueues = data.queues.filter((q) => q.repeatableJobs.length > 0);
  const onDemandQueues = data.queues.filter((q) => q.repeatableJobs.length === 0);

  // Get health status alert styling
  const getHealthAlertStyles = () => {
    switch (data.health?.status) {
      case 'healthy':
        return {
          className: 'border-green-500 bg-green-50 dark:bg-green-950/30',
          icon: <ShieldCheck className="h-4 w-4 text-green-600" />,
          titleClass: 'text-green-800 dark:text-green-200',
          descClass: 'text-green-700 dark:text-green-300',
          title: 'All Systems Operational',
        };
      case 'degraded':
        return {
          className: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/30',
          icon: <AlertTriangle className="h-4 w-4 text-yellow-600" />,
          titleClass: 'text-yellow-800 dark:text-yellow-200',
          descClass: 'text-yellow-700 dark:text-yellow-300',
          title: 'System Degraded',
        };
      case 'critical':
        return {
          className: 'border-red-500 bg-red-50 dark:bg-red-950/30',
          icon: <ShieldAlert className="h-4 w-4 text-red-600" />,
          titleClass: 'text-red-800 dark:text-red-200',
          descClass: 'text-red-700 dark:text-red-300',
          title: 'System Critical',
        };
      default:
        return {
          className: 'border-gray-500 bg-gray-50 dark:bg-gray-950/30',
          icon: <Clock className="h-4 w-4 text-gray-600" />,
          titleClass: 'text-gray-800 dark:text-gray-200',
          descClass: 'text-gray-700 dark:text-gray-300',
          title: 'Checking Status...',
        };
    }
  };

  const healthStyles = getHealthAlertStyles();

  return (
    <div className="space-y-6">
      {/* System Health Status */}
      {data.health && (
        <Alert className={healthStyles.className}>
          {healthStyles.icon}
          <AlertTitle className={healthStyles.titleClass}>
            {healthStyles.title}
          </AlertTitle>
          <AlertDescription className={healthStyles.descClass}>
            {data.health.message}
            {data.health.totalActive > 0 && (
              <span className="ml-2">• {data.health.totalActive} job{data.health.totalActive !== 1 ? 's' : ''} currently running</span>
            )}
          </AlertDescription>
        </Alert>
      )}
      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Jobs</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.queues.reduce((sum, q) => sum + q.active, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Waiting</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.queues.reduce((sum, q) => sum + q.waiting, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold mt-1">
              {data.queues.reduce((sum, q) => sum + q.failed, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recurring Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recurring Jobs</CardTitle>
            <CardDescription>
              Scheduled jobs that run automatically at regular intervals
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Last Run</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recurringQueues.map((queue) => (
                <TableRow key={queue.name}>
                  <TableCell className="font-medium">{queue.displayName}</TableCell>
                  <TableCell>
                    {queue.repeatableJobs[0] &&
                      formatCronPattern(queue.repeatableJobs[0].pattern)}
                  </TableCell>
                  <TableCell>
                    {formatLastRun(queue.lastCompletedJob?.timestamp)}
                  </TableCell>
                  <TableCell>
                    {queue.repeatableJobs[0] &&
                      formatNextRun(queue.repeatableJobs[0].next)}
                  </TableCell>
                  <TableCell>{getStatusBadge(getQueueHealthStatus(queue))}</TableCell>
                  <TableCell className="text-right">{queue.active}</TableCell>
                  <TableCell className="text-right">
                    <span className={queue.failed > 0 ? 'text-red-500 font-medium' : ''}>
                      {queue.failed}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* On-Demand Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>On-Demand Jobs</CardTitle>
            <CardDescription>
              Jobs triggered by user actions or system events
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearGmailSync}
            disabled={isClearing}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            {isClearing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <XCircle className="h-4 w-4 mr-2" />
            )}
            Clear Gmail Sync
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Queue</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Active</TableHead>
                <TableHead className="text-right">Waiting</TableHead>
                <TableHead className="text-right">Failed</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {onDemandQueues.map((queue) => (
                <TableRow key={queue.name}>
                  <TableCell className="font-medium">{queue.displayName}</TableCell>
                  <TableCell>{getStatusBadge(getQueueHealthStatus(queue))}</TableCell>
                  <TableCell className="text-right">{queue.active}</TableCell>
                  <TableCell className="text-right">{queue.waiting}</TableCell>
                  <TableCell className="text-right">
                    <span className={queue.failed > 0 ? 'text-red-500 font-medium' : ''}>
                      {queue.failed}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Failed Jobs */}
      {(() => {
        const allFailedJobs = data.queues.flatMap((q) =>
          q.recentFailedJobs.map((job) => ({
            ...job,
            queueName: q.displayName,
          }))
        );

        if (allFailedJobs.length === 0) return null;

        // Sort by timestamp descending (most recent first)
        allFailedJobs.sort((a, b) => b.timestamp - a.timestamp);

        return (
          <Card className="border-red-200 dark:border-red-900">
            <CardHeader>
              <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Recent Failed Jobs
              </CardTitle>
              <CardDescription>
                Jobs that failed recently - these may need attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Queue</TableHead>
                    <TableHead>Job</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allFailedJobs.slice(0, 10).map((job, index) => (
                    <TableRow key={`${job.queueName}-${job.id}-${index}`}>
                      <TableCell className="font-medium">{job.queueName}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {job.name.length > 30 ? job.name.substring(0, 30) + '...' : job.name}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <span className="text-red-600 dark:text-red-400 text-sm">
                          {truncateError(job.failedReason)}
                        </span>
                      </TableCell>
                      <TableCell>{formatLastRun(job.timestamp)}</TableCell>
                      <TableCell className="text-right">{job.attemptsMade}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })()}

      {/* Last Updated */}
      <p className="text-xs text-muted-foreground text-center">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
