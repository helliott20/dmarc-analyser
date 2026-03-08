'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2, Mail, Bell, TrendingUp, Clock } from 'lucide-react';

const SEVERITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'critical', label: 'Critical' },
] as const;

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
  const ampm = i < 12 ? 'AM' : 'PM';
  return { value: i, label: `${hour12}:00 ${ampm}` };
});

const notificationsFormSchema = z.object({
  emailLoginAlerts: z.boolean(),
  emailWeeklyDigest: z.boolean(),
  emailAlertNotifications: z.boolean(),
  emailAlertSeverity: z.string(),
  emailDigestFrequency: z.enum(['daily', 'weekly', 'monthly', 'never']),
  quietHoursEnabled: z.boolean(),
  emailQuietHoursStart: z.number().int().min(0).max(23).nullable(),
  emailQuietHoursEnd: z.number().int().min(0).max(23).nullable(),
});

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>;

interface NotificationsFormProps {
  preferences: {
    emailLoginAlerts: boolean;
    emailWeeklyDigest: boolean;
    emailAlertNotifications: boolean;
    emailAlertSeverity: string;
    emailDigestFrequency: string;
    emailQuietHoursStart: number | null;
    emailQuietHoursEnd: number | null;
  };
}

export function NotificationsForm({ preferences }: NotificationsFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: {
      emailLoginAlerts: preferences.emailLoginAlerts,
      emailWeeklyDigest: preferences.emailWeeklyDigest,
      emailAlertNotifications: preferences.emailAlertNotifications,
      emailAlertSeverity: preferences.emailAlertSeverity || 'warning,critical',
      emailDigestFrequency: (preferences.emailDigestFrequency as 'daily' | 'weekly' | 'monthly' | 'never') || 'weekly',
      quietHoursEnabled: preferences.emailQuietHoursStart !== null,
      emailQuietHoursStart: preferences.emailQuietHoursStart,
      emailQuietHoursEnd: preferences.emailQuietHoursEnd,
    },
  });

  const alertsEnabled = form.watch('emailAlertNotifications');
  const quietHoursEnabled = form.watch('quietHoursEnabled');
  const selectedSeverities = form.watch('emailAlertSeverity').split(',').filter(Boolean);

  function toggleSeverity(severity: string) {
    const current = form.getValues('emailAlertSeverity').split(',').filter(Boolean);
    let updated: string[];
    if (current.includes(severity)) {
      updated = current.filter((s) => s !== severity);
    } else {
      updated = [...current, severity];
    }
    // Ensure at least one severity is selected
    if (updated.length === 0) return;
    form.setValue('emailAlertSeverity', updated.join(','), { shouldDirty: true });
  }

  async function onSubmit(data: NotificationsFormValues) {
    setIsLoading(true);

    try {
      // Map form values to API format
      const payload: Record<string, unknown> = {
        emailLoginAlerts: data.emailLoginAlerts,
        emailWeeklyDigest: data.emailDigestFrequency !== 'never',
        emailAlertNotifications: data.emailAlertNotifications,
        emailAlertSeverity: data.emailAlertSeverity,
        emailDigestFrequency: data.emailDigestFrequency,
        emailQuietHoursStart: data.quietHoursEnabled ? (data.emailQuietHoursStart ?? 22) : null,
        emailQuietHoursEnd: data.quietHoursEnabled ? (data.emailQuietHoursEnd ?? 7) : null,
      };

      const response = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      toast.success('Notification preferences updated');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update preferences');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Security Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Security Notifications
            </CardTitle>
            <CardDescription>
              Get notified about important security events
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="emailLoginAlerts"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Login Alerts</FormLabel>
                    <FormDescription>
                      Receive email notifications when your account is accessed from a new device or
                      location
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Alert Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alert Notifications
            </CardTitle>
            <CardDescription>
              Get notified about DMARC alerts across all your organisations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="emailAlertNotifications"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Email Alerts</FormLabel>
                    <FormDescription>
                      Receive email notifications when DMARC alerts are triggered in any of
                      your organisations
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {alertsEnabled && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Alert Severity Filter</FormLabel>
                  <FormDescription>
                    Choose which severity levels trigger email notifications
                  </FormDescription>
                </div>
                <div className="flex gap-4">
                  {SEVERITY_OPTIONS.map((option) => (
                    <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={selectedSeverities.includes(option.value)}
                        onCheckedChange={() => toggleSeverity(option.value)}
                      />
                      <span className="text-sm">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Digest Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Digest Notifications
            </CardTitle>
            <CardDescription>
              Get regular summaries of your DMARC data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="emailDigestFrequency"
              render={({ field }) => (
                <FormItem className="rounded-lg border p-4">
                  <div className="flex flex-row items-center justify-between">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Email Digest</FormLabel>
                      <FormDescription>
                        Receive email summaries of DMARC reports and analytics across all your
                        organisations
                      </FormDescription>
                    </div>
                  </div>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-[180px] mt-2">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Quiet Hours
            </CardTitle>
            <CardDescription>
              Suppress non-critical email notifications during specific hours
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="quietHoursEnabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Quiet Hours</FormLabel>
                    <FormDescription>
                      Non-critical notifications will be suppressed during these hours.
                      Critical alerts are always delivered.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {quietHoursEnabled && (
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="emailQuietHoursStart"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>From</FormLabel>
                        <FormControl>
                          <Select
                            value={String(field.value ?? 22)}
                            onValueChange={(v) => field.onChange(parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOUR_OPTIONS.map((h) => (
                                <SelectItem key={h.value} value={String(h.value)}>
                                  {h.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="emailQuietHoursEnd"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormLabel>To</FormLabel>
                        <FormControl>
                          <Select
                            value={String(field.value ?? 7)}
                            onValueChange={(v) => field.onChange(parseInt(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {HOUR_OPTIONS.map((h) => (
                                <SelectItem key={h.value} value={String(h.value)}>
                                  {h.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Preferences
          </Button>
        </div>
      </form>
    </Form>
  );
}
