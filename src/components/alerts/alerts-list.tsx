'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Globe,
  Info,
  Loader2,
  Mail,
  Shield,
  Trash2,
  TrendingDown,
  X,
  XCircle,
  ChevronDown,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: any;
  isRead: boolean;
  isDismissed: boolean;
  createdAt: string;
  domain: {
    id: string;
    domain: string;
  } | null;
}

interface AlertsListProps {
  orgSlug: string;
  filters?: {
    type?: string;
    severity?: string;
    read?: string;
    dismissed?: string;
  };
}

const ALERT_TYPE_ICONS = {
  pass_rate_drop: TrendingDown,
  new_source: Mail,
  dmarc_failure_spike: AlertTriangle,
  dns_change: Globe,
  auth_failure_spike: Shield,
  policy_change: Info,
  compliance_drop: XCircle,
};

const ALERT_TYPE_LABELS = {
  pass_rate_drop: 'Pass Rate Drop',
  new_source: 'New Source',
  dmarc_failure_spike: 'DMARC Failure Spike',
  dns_change: 'DNS Change',
  auth_failure_spike: 'Auth Failure Spike',
  policy_change: 'Policy Change',
  compliance_drop: 'Compliance Drop',
};

const SEVERITY_COLORS = {
  info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800',
  critical: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

interface GroupedAlerts {
  domainId: string | null;
  domainName: string;
  alerts: Alert[];
  unreadCount: number;
}

export function AlertsList({ orgSlug, filters = {} }: AlertsListProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [typeFilter, setTypeFilter] = useState(filters.type || 'all');
  const [severityFilter, setSeverityFilter] = useState(filters.severity || 'all');
  const [readFilter, setReadFilter] = useState(filters.read || 'false');
  const [dismissedFilter, setDismissedFilter] = useState(filters.dismissed || 'false');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (readFilter !== 'all') params.append('read', readFilter);
      if (dismissedFilter !== 'all') params.append('dismissed', dismissedFilter);

      const response = await fetch(
        `/api/orgs/${orgSlug}/alerts?${params.toString()}`
      );
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [orgSlug, typeFilter, severityFilter, readFilter, dismissedFilter]);

  // Optimistic update: mark as read locally, then sync with server
  const markAsRead = async (alertId: string) => {
    // Optimistically update UI
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isRead: true } : a))
    );

    try {
      await fetch(`/api/orgs/${orgSlug}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
      // Revert on error
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, isRead: false } : a))
      );
    }
  };

  // Optimistic update: dismiss locally, then sync with server
  const dismissAlert = async (alertId: string) => {
    // Store the alert in case we need to restore it
    const alertToRestore = alerts.find((a) => a.id === alertId);

    // Optimistically remove from UI
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/alerts/${alertId}/dismiss`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Failed to dismiss: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      // Restore the alert on error
      if (alertToRestore) {
        setAlerts((prev) => [...prev, alertToRestore]);
      }
    }
  };

  // Optimistic update: mark all as read for a domain
  const markAllReadForDomain = async (domainId: string | null) => {
    // Optimistically update UI
    setAlerts((prev) =>
      prev.map((a) => {
        const matches = domainId === null
          ? a.domain === null
          : a.domain?.id === domainId;
        return matches ? { ...a, isRead: true } : a;
      })
    );

    try {
      await fetch(`/api/orgs/${orgSlug}/alerts/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainId }),
      });
    } catch (error) {
      console.error('Failed to mark alerts as read:', error);
      fetchAlerts(); // Refetch on error
    }
  };

  // Bulk delete alerts by type
  const bulkDeleteAlerts = async (type: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/alerts/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const data = await response.json();
      if (response.ok) {
        // Remove deleted alerts from UI
        setAlerts((prev) => prev.filter((a) => a.type !== type));
      }
      return data;
    } catch (error) {
      console.error('Failed to bulk delete alerts:', error);
    } finally {
      setDeleting(false);
    }
  };

  // Count alerts by type for the bulk delete button
  const newSourceAlertCount = alerts.filter((a) => a.type === 'new_source').length;

  // Group alerts by domain
  const groupedAlerts = useMemo(() => {
    const groups = new Map<string, GroupedAlerts>();

    // Initialize org-wide group
    groups.set('org', {
      domainId: null,
      domainName: 'Organization-wide',
      alerts: [],
      unreadCount: 0,
    });

    alerts.forEach((alert) => {
      const key = alert.domain?.id || 'org';
      if (!groups.has(key)) {
        groups.set(key, {
          domainId: alert.domain?.id || null,
          domainName: alert.domain?.domain || 'Unknown Domain',
          alerts: [],
          unreadCount: 0,
        });
      }
      const group = groups.get(key)!;
      group.alerts.push(alert);
      if (!alert.isRead) group.unreadCount++;
    });

    return Array.from(groups.values())
      .filter((g) => g.alerts.length > 0)
      .sort((a, b) => b.unreadCount - a.unreadCount);
  }, [alerts]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-600" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getAlertIcon = (type: string) => {
    const Icon = ALERT_TYPE_ICONS[type as keyof typeof ALERT_TYPE_ICONS] || Bell;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filter Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="pass_rate_drop">Pass Rate Drop</SelectItem>
                  <SelectItem value="new_source">New Source</SelectItem>
                  <SelectItem value="dmarc_failure_spike">
                    DMARC Failure Spike
                  </SelectItem>
                  <SelectItem value="dns_change">DNS Change</SelectItem>
                  <SelectItem value="auth_failure_spike">
                    Auth Failure Spike
                  </SelectItem>
                  <SelectItem value="policy_change">Policy Change</SelectItem>
                  <SelectItem value="compliance_drop">Compliance Drop</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Read</SelectItem>
                  <SelectItem value="false">Unread</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Dismissed</label>
              <Select value={dismissedFilter} onValueChange={setDismissedFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Active</SelectItem>
                  <SelectItem value="true">Dismissed</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {newSourceAlertCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-yellow-600" />
                <span className="text-sm">
                  <strong>{newSourceAlertCount.toLocaleString()}</strong> new source alert{newSourceAlertCount !== 1 ? 's' : ''} found
                </span>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-yellow-300 hover:bg-yellow-100 dark:border-yellow-800 dark:hover:bg-yellow-900/30"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 mr-1" />
                    )}
                    Delete all new source alerts
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete all new source alerts?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete {newSourceAlertCount.toLocaleString()} new source alert{newSourceAlertCount !== 1 ? 's' : ''}.
                      This action cannot be undone. Future reports will generate fewer, consolidated alerts.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => bulkDeleteAlerts('new_source')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete all
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List - Grouped by Domain */}
      {loading ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Loading alerts...</p>
          </CardContent>
        </Card>
      ) : alerts.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">All clear!</h3>
              <p className="text-muted-foreground">
                No alerts match your current filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion
          type="multiple"
          defaultValue={groupedAlerts.map((g) => g.domainId || 'org')}
          className="space-y-2"
        >
          {groupedAlerts.map((group) => (
            <AccordionItem
              key={group.domainId || 'org'}
              value={group.domainId || 'org'}
              className="border rounded-lg bg-card"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>div>svg]:rotate-180">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{group.domainName}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {group.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {group.unreadCount} new
                      </Badge>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {group.alerts.length} alert{group.alerts.length !== 1 ? 's' : ''}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                {/* Mark all read button for this domain */}
                {group.unreadCount > 0 && (
                  <div className="mb-3 flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        markAllReadForDomain(group.domainId);
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Mark all read
                    </Button>
                  </div>
                )}

                <div className="space-y-3">
                  {group.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        !alert.isRead ? 'border-l-4 border-l-primary bg-muted/30' : 'bg-muted/10'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-semibold text-sm">{alert.title}</h3>
                                {!alert.isRead && (
                                  <Badge variant="secondary" className="text-xs">
                                    New
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    SEVERITY_COLORS[alert.severity]
                                  }`}
                                >
                                  {alert.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  {getAlertIcon(alert.type)}
                                  <span className="ml-1">
                                    {ALERT_TYPE_LABELS[
                                      alert.type as keyof typeof ALERT_TYPE_LABELS
                                    ] || alert.type}
                                  </span>
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatDistanceToNow(new Date(alert.createdAt), {
                                    addSuffix: true,
                                  })}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {!alert.isRead && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(alert.id);
                                  }}
                                >
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              )}
                              {!alert.isDismissed && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    dismissAlert(alert.id);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground">
                            {alert.message}
                          </p>

                          {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                            <div className="mt-3 p-3 bg-muted rounded-md">
                              <p className="text-xs font-medium mb-2">Details:</p>
                              <div className="grid gap-1 text-xs">
                                {Object.entries(alert.metadata)
                                  .filter(([key]) => !['sourceIps', 'sources'].includes(key))
                                  .map(([key, value]) => (
                                    <div key={key} className="flex gap-2">
                                      <span className="font-medium">
                                        {key.replace(/_/g, ' ')}:
                                      </span>
                                      <span className="text-muted-foreground">
                                        {typeof value === 'object'
                                          ? JSON.stringify(value)
                                          : String(value)}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
