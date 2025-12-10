'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertTriangle,
  Bell,
  Globe,
  Info,
  Mail,
  Plus,
  Settings,
  Shield,
  Trash2,
  TrendingDown,
  XCircle,
} from 'lucide-react';

interface AlertRule {
  id: string;
  organizationId: string;
  domainId: string | null;
  type: string;
  threshold: any;
  isEnabled: boolean;
  notifyEmail: boolean;
  notifyWebhook: boolean;
  createdAt: string;
  domain: {
    id: string;
    domain: string;
  } | null;
}

interface AlertRulesManagerProps {
  orgSlug: string;
  orgId: string;
}

const ALERT_TYPES = [
  { value: 'pass_rate_drop', label: 'Pass Rate Drop', icon: TrendingDown },
  { value: 'new_source', label: 'New Source', icon: Mail },
  { value: 'dmarc_failure_spike', label: 'DMARC Failure Spike', icon: AlertTriangle },
  { value: 'dns_change', label: 'DNS Change', icon: Globe },
  { value: 'auth_failure_spike', label: 'Auth Failure Spike', icon: Shield },
  { value: 'policy_change', label: 'Policy Change', icon: Info },
  { value: 'compliance_drop', label: 'Compliance Drop', icon: XCircle },
];

export function AlertRulesManager({ orgSlug, orgId }: AlertRulesManagerProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);

  // Form state
  const [formType, setFormType] = useState('pass_rate_drop');
  const [formDomainId, setFormDomainId] = useState<string>('');
  const [formThreshold, setFormThreshold] = useState('90');
  const [formNotifyEmail, setFormNotifyEmail] = useState(true);
  const [formNotifyWebhook, setFormNotifyWebhook] = useState(false);

  const fetchRules = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/alert-rules`);
      const data = await response.json();
      setRules(data || []);
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [orgSlug]);

  const handleCreateRule = async () => {
    try {
      const threshold =
        formType === 'pass_rate_drop' || formType === 'compliance_drop'
          ? { passRate: parseInt(formThreshold, 10), period: '24h' }
          : formType === 'dmarc_failure_spike' || formType === 'auth_failure_spike'
          ? { increasePercent: parseInt(formThreshold, 10), period: '1h' }
          : null;

      const response = await fetch(`/api/orgs/${orgSlug}/alert-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formType,
          domainId: formDomainId || null,
          threshold,
          notifyEmail: formNotifyEmail,
          notifyWebhook: formNotifyWebhook,
        }),
      });

      if (response.ok) {
        setDialogOpen(false);
        resetForm();
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to create alert rule:', error);
    }
  };

  const handleUpdateRule = async (
    ruleId: string,
    updates: Partial<AlertRule>
  ) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/alert-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to update alert rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this alert rule?')) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/alert-rules/${ruleId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete alert rule:', error);
    }
  };

  const resetForm = () => {
    setFormType('pass_rate_drop');
    setFormDomainId('');
    setFormThreshold('90');
    setFormNotifyEmail(true);
    setFormNotifyWebhook(false);
    setEditingRule(null);
  };

  const getTypeIcon = (type: string) => {
    const alertType = ALERT_TYPES.find((t) => t.value === type);
    const Icon = alertType?.icon || Bell;
    return <Icon className="h-4 w-4" />;
  };

  const getThresholdDisplay = (rule: AlertRule) => {
    if (!rule.threshold) return 'Default';
    if (rule.threshold.passRate)
      return `Pass rate < ${rule.threshold.passRate}%`;
    if (rule.threshold.increasePercent)
      return `+${rule.threshold.increasePercent}% increase`;
    return 'Custom';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Alert Rules</CardTitle>
            <CardDescription>
              Configure when and how you receive alerts
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Alert Rule</DialogTitle>
                <DialogDescription>
                  Configure a new alert rule for your organization
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Alert Type</Label>
                  <Select value={formType} onValueChange={setFormType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALERT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formType === 'pass_rate_drop' ||
                  formType === 'compliance_drop' ||
                  formType === 'dmarc_failure_spike' ||
                  formType === 'auth_failure_spike') && (
                  <div className="space-y-2">
                    <Label>
                      {formType.includes('drop')
                        ? 'Minimum Pass Rate (%)'
                        : 'Spike Threshold (%)'}
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={formThreshold}
                      onChange={(e) => setFormThreshold(e.target.value)}
                      placeholder="90"
                    />
                    <p className="text-xs text-muted-foreground">
                      {formType.includes('drop')
                        ? 'Alert when pass rate falls below this percentage'
                        : 'Alert when failures increase by this percentage'}
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  <Label>Notification Methods</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyEmail"
                      checked={formNotifyEmail}
                      onCheckedChange={(checked) =>
                        setFormNotifyEmail(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="notifyEmail"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Email notifications
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="notifyWebhook"
                      checked={formNotifyWebhook}
                      onCheckedChange={(checked) =>
                        setFormNotifyWebhook(checked as boolean)
                      }
                    />
                    <label
                      htmlFor="notifyWebhook"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Webhook notifications
                    </label>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateRule}>Create Rule</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading alert rules...
            </p>
          ) : rules.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No alert rules</h3>
              <p className="text-muted-foreground mb-4">
                Create your first alert rule to start monitoring
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">{getTypeIcon(rule.type)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {ALERT_TYPES.find((t) => t.value === rule.type)
                            ?.label || rule.type}
                        </h4>
                        {rule.domain && (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            {rule.domain.domain}
                          </Badge>
                        )}
                        {!rule.domain && (
                          <Badge variant="secondary" className="text-xs">
                            Org-wide
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {getThresholdDisplay(rule)}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {rule.notifyEmail && (
                          <Badge variant="outline" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            Email
                          </Badge>
                        )}
                        {rule.notifyWebhook && (
                          <Badge variant="outline" className="text-xs">
                            <Bell className="h-3 w-3 mr-1" />
                            Webhook
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.isEnabled}
                      onCheckedChange={(enabled) =>
                        handleUpdateRule(rule.id, { isEnabled: enabled })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
