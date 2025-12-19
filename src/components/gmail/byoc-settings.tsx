'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Loader2, ExternalLink, Shield, Key, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ByocSettingsProps {
  orgSlug: string;
  orgId: string;
  canManage: boolean;
  useCustomOauth: boolean;
  hasCredentials: boolean;
}

export function ByocSettings({
  orgSlug,
  orgId,
  canManage,
  useCustomOauth,
  hasCredentials,
}: ByocSettingsProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(useCustomOauth);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleToggle = async (newEnabled: boolean) => {
    if (!canManage) return;

    // If disabling, just update the flag
    if (!newEnabled) {
      setSaving(true);
      setError(null);

      try {
        const res = await fetch(`/api/orgs/${orgSlug}/settings/byoc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ enabled: false }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Failed to update settings');
        }

        setEnabled(false);
        setShowForm(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update settings');
      } finally {
        setSaving(false);
      }
      return;
    }

    // If enabling, show the form
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      setError('Both Client ID and Client Secret are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/orgs/${orgSlug}/settings/byoc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: true,
          clientId: clientId.trim(),
          clientSecret: clientSecret.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save credentials');
      }

      setEnabled(true);
      setShowForm(false);
      setClientId('');
      setClientSecret('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save credentials');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setClientId('');
    setClientSecret('');
    setError(null);
  };

  if (!canManage) {
    return (
      <div className="text-sm text-muted-foreground">
        {enabled ? (
          <p>Custom OAuth credentials are configured for this organization.</p>
        ) : (
          <p>Custom OAuth is not enabled. Contact an admin to configure.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Enable/Disable Toggle */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="byoc-toggle" className="text-base font-medium">
            Use Custom OAuth Credentials
          </Label>
          <p className="text-sm text-muted-foreground">
            Connect your own Google Cloud project for Gmail access
          </p>
        </div>
        <Switch
          id="byoc-toggle"
          checked={enabled || showForm}
          onCheckedChange={handleToggle}
          disabled={saving}
        />
      </div>

      {/* Credentials already configured */}
      {enabled && hasCredentials && !showForm && (
        <div className="p-4 bg-muted rounded-lg space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span className="font-medium">OAuth credentials configured</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Your Google Cloud OAuth credentials are securely stored. For security, the Client Secret cannot be viewed.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            <Key className="h-4 w-4 mr-2" />
            Update Credentials
          </Button>
        </div>
      )}

      {/* Credentials form */}
      {showForm && (
        <div className="p-4 border rounded-lg space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Google Cloud OAuth Credentials
            </h4>
            <p className="text-sm text-muted-foreground">
              Create OAuth 2.0 credentials in your Google Cloud Console. You&apos;ll need a project with the Gmail API enabled.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <a
                href="/help/gmail-oauth-setup"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                View setup guide
              </a>
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
              >
                Open Google Cloud Console
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-id">Client ID</Label>
              <Input
                id="client-id"
                type="text"
                placeholder="xxxxxxxxxx.apps.googleusercontent.com"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-secret">Client Secret</Label>
              <Input
                id="client-secret"
                type="password"
                placeholder="Enter your client secret"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                disabled={saving}
              />
              <p className="text-xs text-muted-foreground">
                This value will be encrypted and cannot be retrieved after saving
              </p>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Credentials
            </Button>
            <Button variant="outline" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
          </div>

          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Required OAuth scopes:</strong> gmail.readonly, gmail.modify, gmail.send, userinfo.email
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Add your callback URL: <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">
                {typeof window !== 'undefined' ? window.location.origin : ''}/api/gmail/callback
              </code>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
