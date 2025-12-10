'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Globe,
  Info,
  Mail,
  Shield,
  TrendingDown,
  X,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
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
  info: 'bg-blue-100 text-blue-800 border-blue-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

export function AlertsList({ orgSlug, filters = {} }: AlertsListProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
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

  const markAsRead = async (alertId: string) => {
    try {
      await fetch(`/api/orgs/${orgSlug}/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isRead: true }),
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/orgs/${orgSlug}/alerts/${alertId}/dismiss`, {
        method: 'POST',
      });
      fetchAlerts();
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
    }
  };

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

      {/* Alerts List */}
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
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`transition-colors ${
                !alert.isRead ? 'border-l-4 border-l-primary bg-muted/30' : ''
              }`}
            >
              <CardContent className="p-4">
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
                          {alert.domain && (
                            <Badge variant="outline" className="text-xs">
                              <Globe className="h-3 w-3 mr-1" />
                              {alert.domain.domain}
                            </Badge>
                          )}
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
                            onClick={() => markAsRead(alert.id)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {!alert.isDismissed && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => dismissAlert(alert.id)}
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
                          {Object.entries(alert.metadata).map(([key, value]) => (
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
