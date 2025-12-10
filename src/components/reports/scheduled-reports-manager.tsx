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
import { Textarea } from '@/components/ui/textarea';
import {
  Calendar,
  Clock,
  Globe,
  Mail,
  Plus,
  Send,
  Trash2,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';

interface ScheduledReport {
  id: string;
  organizationId: string;
  domainId: string | null;
  name: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hour: number;
  timezone: string;
  recipients: string;
  includeCharts: boolean;
  includeSources: boolean;
  includeFailures: boolean;
  lastSentAt: string | null;
  nextRunAt: string | null;
  isActive: boolean;
  createdAt: string;
  domain: {
    id: string;
    domain: string;
  } | null;
}

interface Domain {
  id: string;
  domain: string;
}

interface ScheduledReportsManagerProps {
  orgSlug: string;
  orgId: string;
}

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Shanghai (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
];

export function ScheduledReportsManager({
  orgSlug,
  orgId,
}: ScheduledReportsManagerProps) {
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<ScheduledReport | null>(
    null
  );
  const [testingSendId, setTestingSendId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDomainId, setFormDomainId] = useState<string>('_all');
  const [formFrequency, setFormFrequency] = useState('weekly');
  const [formDayOfWeek, setFormDayOfWeek] = useState('1'); // Monday
  const [formDayOfMonth, setFormDayOfMonth] = useState('1');
  const [formHour, setFormHour] = useState('9');
  const [formTimezone, setFormTimezone] = useState('UTC');
  const [formRecipients, setFormRecipients] = useState('');
  const [formIncludeCharts, setFormIncludeCharts] = useState(true);
  const [formIncludeSources, setFormIncludeSources] = useState(true);
  const [formIncludeFailures, setFormIncludeFailures] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/scheduled-reports`);
      if (response.ok) {
        const data = await response.json();
        setReports(data || []);
      }
    } catch (error) {
      console.error('Failed to fetch scheduled reports:', error);
      toast.error('Failed to load scheduled reports');
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
    fetchReports();
    fetchDomains();
  }, [orgSlug]);

  const resetForm = () => {
    setFormName('');
    setFormDomainId('');
    setFormFrequency('weekly');
    setFormDayOfWeek('1');
    setFormDayOfMonth('1');
    setFormHour('9');
    setFormTimezone('UTC');
    setFormRecipients('');
    setFormIncludeCharts(true);
    setFormIncludeSources(true);
    setFormIncludeFailures(true);
    setEditingReport(null);
  };

  const handleCreateReport = async () => {
    try {
      // Validate recipients
      const recipientsArray = formRecipients
        .split(/[,\n]/)
        .map((email) => email.trim())
        .filter((email) => email.length > 0);

      if (recipientsArray.length === 0) {
        toast.error('Please enter at least one recipient email');
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = recipientsArray.filter(
        (email) => !emailRegex.test(email)
      );
      if (invalidEmails.length > 0) {
        toast.error(`Invalid email addresses: ${invalidEmails.join(', ')}`);
        return;
      }

      const payload = {
        name: formName,
        domainId: formDomainId === '_all' ? null : formDomainId,
        frequency: formFrequency,
        dayOfWeek:
          formFrequency === 'weekly' ? parseInt(formDayOfWeek, 10) : null,
        dayOfMonth:
          formFrequency === 'monthly' ? parseInt(formDayOfMonth, 10) : null,
        hour: parseInt(formHour, 10),
        timezone: formTimezone,
        recipients: JSON.stringify(recipientsArray),
        includeCharts: formIncludeCharts,
        includeSources: formIncludeSources,
        includeFailures: formIncludeFailures,
      };

      const response = await fetch(`/api/orgs/${orgSlug}/scheduled-reports`, {
        method: editingReport ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editingReport ? { ...payload, id: editingReport.id } : payload
        ),
      });

      if (response.ok) {
        toast.success(
          editingReport
            ? 'Scheduled report updated'
            : 'Scheduled report created'
        );
        setDialogOpen(false);
        resetForm();
        fetchReports();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to save scheduled report');
      }
    } catch (error) {
      console.error('Failed to create scheduled report:', error);
      toast.error('Failed to save scheduled report');
    }
  };

  const handleUpdateReport = async (
    reportId: string,
    updates: Partial<ScheduledReport>
  ) => {
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/scheduled-reports/${reportId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        toast.success('Report updated');
        fetchReports();
      } else {
        toast.error('Failed to update report');
      }
    } catch (error) {
      console.error('Failed to update scheduled report:', error);
      toast.error('Failed to update report');
    }
  };

  const handleDeleteReport = async (reportId: string) => {
    if (!confirm('Are you sure you want to delete this scheduled report?')) {
      return;
    }

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/scheduled-reports/${reportId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        toast.success('Scheduled report deleted');
        fetchReports();
      } else {
        toast.error('Failed to delete report');
      }
    } catch (error) {
      console.error('Failed to delete scheduled report:', error);
      toast.error('Failed to delete report');
    }
  };

  const handleTestSend = async (reportId: string) => {
    setTestingSendId(reportId);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/scheduled-reports/${reportId}/test`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        toast.success('Test email sent successfully');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to send test email');
      }
    } catch (error) {
      console.error('Failed to send test email:', error);
      toast.error('Failed to send test email');
    } finally {
      setTestingSendId(null);
    }
  };

  const handleEditReport = (report: ScheduledReport) => {
    setEditingReport(report);
    setFormName(report.name);
    setFormDomainId(report.domainId || '');
    setFormFrequency(report.frequency);
    setFormDayOfWeek(report.dayOfWeek?.toString() || '1');
    setFormDayOfMonth(report.dayOfMonth?.toString() || '1');
    setFormHour(report.hour.toString());
    setFormTimezone(report.timezone);
    try {
      const recipients = JSON.parse(report.recipients);
      setFormRecipients(Array.isArray(recipients) ? recipients.join('\n') : '');
    } catch {
      setFormRecipients('');
    }
    setFormIncludeCharts(report.includeCharts);
    setFormIncludeSources(report.includeSources);
    setFormIncludeFailures(report.includeFailures);
    setDialogOpen(true);
  };

  const getFrequencyDisplay = (report: ScheduledReport) => {
    if (report.frequency === 'daily') {
      return 'Daily';
    } else if (report.frequency === 'weekly') {
      const day = DAYS_OF_WEEK.find((d) => d.value === report.dayOfWeek);
      return `Weekly on ${day?.label || 'Unknown'}`;
    } else if (report.frequency === 'monthly') {
      const suffix =
        report.dayOfMonth === 1
          ? 'st'
          : report.dayOfMonth === 2
          ? 'nd'
          : report.dayOfMonth === 3
          ? 'rd'
          : 'th';
      return `Monthly on the ${report.dayOfMonth}${suffix}`;
    }
    return report.frequency;
  };

  const getTimeDisplay = (report: ScheduledReport) => {
    const hour = report.hour;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${ampm} ${report.timezone}`;
  };

  const getRecipientsCount = (recipientsJson: string) => {
    try {
      const recipients = JSON.parse(recipientsJson);
      return Array.isArray(recipients) ? recipients.length : 0;
    } catch {
      return 0;
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Scheduled Reports</CardTitle>
            <CardDescription>
              Configure automated email digests of your DMARC data
            </CardDescription>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReport ? 'Edit Scheduled Report' : 'Create Scheduled Report'}
                </DialogTitle>
                <DialogDescription>
                  Configure an automated email report for your DMARC data
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Report Name */}
                <div className="space-y-2">
                  <Label>Report Name</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Weekly DMARC Summary"
                  />
                </div>

                {/* Domain Selection */}
                <div className="space-y-2">
                  <Label>Domain</Label>
                  <Select value={formDomainId} onValueChange={setFormDomainId}>
                    <SelectTrigger>
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
                  <p className="text-xs text-muted-foreground">
                    Leave empty to include all domains in the report
                  </p>
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={formFrequency}
                    onValueChange={setFormFrequency}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Day of Week (for weekly) */}
                {formFrequency === 'weekly' && (
                  <div className="space-y-2">
                    <Label>Day of Week</Label>
                    <Select
                      value={formDayOfWeek}
                      onValueChange={setFormDayOfWeek}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS_OF_WEEK.map((day) => (
                          <SelectItem key={day.value} value={day.value.toString()}>
                            {day.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Day of Month (for monthly) */}
                {formFrequency === 'monthly' && (
                  <div className="space-y-2">
                    <Label>Day of Month</Label>
                    <Select
                      value={formDayOfMonth}
                      onValueChange={setFormDayOfMonth}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(
                          (day) => (
                            <SelectItem key={day} value={day.toString()}>
                              {day}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Hour (24h format)</Label>
                    <Select value={formHour} onValueChange={setFormHour}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i).map((hour) => (
                          <SelectItem key={hour} value={hour.toString()}>
                            {hour.toString().padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timezone</Label>
                    <Select
                      value={formTimezone}
                      onValueChange={setFormTimezone}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Recipients */}
                <div className="space-y-2">
                  <Label>Recipients</Label>
                  <Textarea
                    value={formRecipients}
                    onChange={(e) => setFormRecipients(e.target.value)}
                    placeholder="email1@example.com&#10;email2@example.com&#10;email3@example.com"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one email per line or separate with commas
                  </p>
                </div>

                {/* Report Content Options */}
                <div className="space-y-3">
                  <Label>Report Content</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeCharts"
                        checked={formIncludeCharts}
                        onCheckedChange={(checked) =>
                          setFormIncludeCharts(checked as boolean)
                        }
                      />
                      <label
                        htmlFor="includeCharts"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Include charts and visualizations
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeSources"
                        checked={formIncludeSources}
                        onCheckedChange={(checked) =>
                          setFormIncludeSources(checked as boolean)
                        }
                      />
                      <label
                        htmlFor="includeSources"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Include top email sources
                      </label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="includeFailures"
                        checked={formIncludeFailures}
                        onCheckedChange={(checked) =>
                          setFormIncludeFailures(checked as boolean)
                        }
                      />
                      <label
                        htmlFor="includeFailures"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        Include authentication failures
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateReport}>
                  {editingReport ? 'Update Report' : 'Create Report'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">
              Loading scheduled reports...
            </p>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No scheduled reports
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first scheduled report to receive automated email
                digests
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <div
                  key={report.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{report.name}</h4>
                        {report.domain ? (
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            {report.domain.domain}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            All domains
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-2">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getFrequencyDisplay(report)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeDisplay(report)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {getRecipientsCount(report.recipients)} recipients
                        </div>
                      </div>

                      {report.lastSentAt && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Last sent:{' '}
                          {new Date(report.lastSentAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestSend(report.id)}
                      disabled={testingSendId === report.id}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Test
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditReport(report)}
                    >
                      Edit
                    </Button>
                    <Switch
                      checked={report.isActive}
                      onCheckedChange={(enabled) =>
                        handleUpdateReport(report.id, { isActive: enabled })
                      }
                    />
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteReport(report.id)}
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
