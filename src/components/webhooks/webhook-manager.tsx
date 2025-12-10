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
  AlertCircle,
  CheckCircle2,
  Copy,
  Globe,
  Loader2,
  Plus,
  Send,
  Trash2,
  Webhook,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface WebhookData {
  id: string;
  organizationId: string;
  name: string;
  type: 'slack' | 'discord' | 'teams' | 'custom';
  url: string;
  secret: string | null;
  events: string;
  severityFilter: string | null;
  domainFilter: string | null;
  isActive: boolean;
  lastTriggeredAt: string | null;
  failureCount: number;
  createdAt: string;
  updatedAt: string;
  domain: {
    id: string;
    domain: string;
  } | null;
}

interface Domain {
  id: string;
  domain: string;
}

interface WebhookManagerProps {
  orgSlug: string;
  orgId: string;
}

const WEBHOOK_TYPES = [
  { value: 'slack', label: 'Slack', placeholder: 'https://hooks.slack.com/services/...' },
  { value: 'discord', label: 'Discord', placeholder: 'https://discord.com/api/webhooks/...' },
  { value: 'teams', label: 'Microsoft Teams', placeholder: 'https://outlook.office.com/webhook/...' },
  { value: 'custom', label: 'Custom URL', placeholder: 'https://your-server.com/webhook' },
];

const AVAILABLE_EVENTS = [
  { value: 'alert.created', label: 'Alert Created', description: 'When a new alert is triggered' },
  { value: 'report.received', label: 'Report Received', description: 'When a new DMARC report arrives' },
  { value: 'source.new', label: 'New Source', description: 'When email from a new IP is detected' },
  { value: 'domain.verified', label: 'Domain Verified', description: 'When a domain is verified' },
  { value: 'compliance.drop', label: 'Compliance Drop', description: 'When compliance metrics drop' },
];

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
];

export function WebhookManager({ orgSlug, orgId }: WebhookManagerProps) {
  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'slack' | 'discord' | 'teams' | 'custom'>('slack');
  const [formUrl, setFormUrl] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['alert.created']);
  const [formSeverityFilter, setFormSeverityFilter] = useState<string[]>([]);
  const [formDomainFilter, setFormDomainFilter] = useState<string>('_all');

  const fetchWebhooks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/webhooks`);
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data || []);
      } else {
        toast.error('Failed to fetch webhooks');
      }
    } catch (error) {
      console.error('Failed to fetch webhooks:', error);
      toast.error('Failed to fetch webhooks');
    } finally {
      setLoading(false);
    }
  };

  const fetchDomains = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/domains`);
      if (response.ok) {
        const data = await response.json();
        setDomains(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    }
  };

  useEffect(() => {
    fetchWebhooks();
    fetchDomains();
  }, [orgSlug]);

  const resetForm = () => {
    setFormName('');
    setFormType('slack');
    setFormUrl('');
    setFormEvents(['alert.created']);
    setFormSeverityFilter([]);
    setFormDomainFilter('');
    setNewWebhookSecret(null);
  };

  const handleCreateWebhook = async () => {
    if (!formName || !formUrl || formEvents.length === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          type: formType,
          url: formUrl,
          events: formEvents,
          severityFilter: formSeverityFilter.length > 0 ? formSeverityFilter : null,
          domainFilter: formDomainFilter === '_all' ? null : formDomainFilter,
        }),
      });

      if (response.ok) {
        const newWebhook = await response.json();

        // If it's a custom webhook, save the secret (only shown once)
        if (formType === 'custom' && newWebhook.secret) {
          setNewWebhookSecret(newWebhook.secret);
        } else {
          setDialogOpen(false);
          resetForm();
        }

        toast.success('Webhook created successfully');
        fetchWebhooks();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create webhook');
      }
    } catch (error) {
      console.error('Failed to create webhook:', error);
      toast.error('Failed to create webhook');
    }
  };

  const handleToggleActive = async (webhookId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        toast.success(`Webhook ${isActive ? 'enabled' : 'disabled'}`);
        fetchWebhooks();
      } else {
        throw new Error('Failed to update webhook');
      }
    } catch (error) {
      console.error('Failed to update webhook:', error);
      toast.error('Failed to update webhook');
    }
  };

  const handleTestWebhook = async (webhookId: string) => {
    setTestingWebhook(webhookId);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/webhooks/${webhookId}/test`, {
        method: 'POST',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Test webhook sent successfully');
        fetchWebhooks(); // Refresh to update lastTriggeredAt
      } else {
        toast.error(data.error || 'Failed to send test webhook');
      }
    } catch (error) {
      console.error('Failed to test webhook:', error);
      toast.error('Failed to test webhook');
    } finally {
      setTestingWebhook(null);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!confirm('Are you sure you want to delete this webhook? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/webhooks/${webhookId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Webhook deleted successfully');
        fetchWebhooks();
      } else {
        throw new Error('Failed to delete webhook');
      }
    } catch (error) {
      console.error('Failed to delete webhook:', error);
      toast.error('Failed to delete webhook');
    }
  };

  const copySecret = () => {
    if (newWebhookSecret) {
      navigator.clipboard.writeText(newWebhookSecret);
      toast.success('Secret copied to clipboard');
    }
  };

  const closeSecretDialog = () => {
    setNewWebhookSecret(null);
    setDialogOpen(false);
    resetForm();
  };

  const getStatusBadge = (webhook: WebhookData) => {
    if (!webhook.isActive) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (webhook.failureCount > 5) {
      return <Badge variant="destructive">Failing</Badge>;
    }
    if (webhook.failureCount > 0) {
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Warning</Badge>;
    }
    return <Badge variant="outline" className="border-green-500 text-green-700">Active</Badge>;
  };

  const getTypeIcon = (type: string) => {
    return WEBHOOK_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    return new Date(dateStr).toLocaleString();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhooks</CardTitle>
            <CardDescription>
              Configure webhooks to receive real-time notifications
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              {newWebhookSecret ? (
                // Show secret only once
                <>
                  <DialogHeader>
                    <DialogTitle>Webhook Created Successfully</DialogTitle>
                    <DialogDescription>
                      Save this secret now - it won&apos;t be shown again!
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm font-semibold text-yellow-900 mb-2">
                        Important: Save Your Webhook Secret
                      </p>
                      <p className="text-sm text-yellow-800 mb-3">
                        This secret will be used to sign webhook payloads. Store it securely
                        as it will not be displayed again.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono break-all">
                          {newWebhookSecret}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={copySecret}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={closeSecretDialog}>
                      Done
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                // Create webhook form
                <>
                  <DialogHeader>
                    <DialogTitle>Create Webhook</DialogTitle>
                    <DialogDescription>
                      Set up a new webhook to receive notifications
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="My Slack Webhook"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="type">Type *</Label>
                      <Select
                        value={formType}
                        onValueChange={(value: any) => setFormType(value)}
                      >
                        <SelectTrigger id="type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WEBHOOK_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="url">Webhook URL *</Label>
                      <Input
                        id="url"
                        type="url"
                        value={formUrl}
                        onChange={(e) => setFormUrl(e.target.value)}
                        placeholder={
                          WEBHOOK_TYPES.find((t) => t.value === formType)?.placeholder
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Events to Subscribe * (select at least one)</Label>
                      <div className="space-y-2 border rounded-lg p-3">
                        {AVAILABLE_EVENTS.map((event) => (
                          <div key={event.value} className="flex items-start space-x-2">
                            <Checkbox
                              id={`event-${event.value}`}
                              checked={formEvents.includes(event.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormEvents([...formEvents, event.value]);
                                } else {
                                  setFormEvents(
                                    formEvents.filter((e) => e !== event.value)
                                  );
                                }
                              }}
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`event-${event.value}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {event.label}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {event.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Severity Filter (optional)</Label>
                      <div className="flex gap-2">
                        {SEVERITY_OPTIONS.map((severity) => (
                          <div key={severity.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`severity-${severity.value}`}
                              checked={formSeverityFilter.includes(severity.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setFormSeverityFilter([...formSeverityFilter, severity.value]);
                                } else {
                                  setFormSeverityFilter(
                                    formSeverityFilter.filter((s) => s !== severity.value)
                                  );
                                }
                              }}
                            />
                            <label
                              htmlFor={`severity-${severity.value}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {severity.label}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to receive all severities
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="domain">Domain Filter (optional)</Label>
                      <Select
                        value={formDomainFilter}
                        onValueChange={setFormDomainFilter}
                      >
                        <SelectTrigger id="domain">
                          <SelectValue placeholder="All domains" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_all">All domains</SelectItem>
                          {domains.map((domain) => (
                            <SelectItem key={domain.id} value={domain.id}>
                              {domain.domain}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateWebhook}>Create Webhook</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading webhooks...
            </p>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No webhooks configured</h3>
              <p className="text-muted-foreground mb-4">
                Create your first webhook to start receiving notifications
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <Webhook className="h-5 w-5 mt-1 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-medium text-sm">{webhook.name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {getTypeIcon(webhook.type)}
                        </Badge>
                        {getStatusBadge(webhook)}
                        {webhook.domain && (
                          <Badge variant="secondary" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            {webhook.domain.domain}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2 truncate">
                        {webhook.url}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          Events: {JSON.parse(webhook.events).length}
                        </span>
                        {webhook.severityFilter && (
                          <span>
                            Severity: {JSON.parse(webhook.severityFilter).join(', ')}
                          </span>
                        )}
                        {webhook.lastTriggeredAt && (
                          <span>
                            Last triggered: {formatDate(webhook.lastTriggeredAt)}
                          </span>
                        )}
                        {webhook.failureCount > 0 && (
                          <span className="text-yellow-600">
                            {webhook.failureCount} failures
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestWebhook(webhook.id)}
                      disabled={testingWebhook === webhook.id}
                    >
                      {testingWebhook === webhook.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                    <Switch
                      checked={webhook.isActive}
                      onCheckedChange={(checked) =>
                        handleToggleActive(webhook.id, checked)
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteWebhook(webhook.id)}
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
