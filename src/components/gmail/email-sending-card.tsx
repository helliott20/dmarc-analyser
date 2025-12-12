'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Switch } from '@/components/ui/switch';
import { Send, Loader2, Mail, CheckCircle2, AlertTriangle, KeyRound, Plus, Globe } from 'lucide-react';
import { toast } from 'sonner';

interface GmailAccount {
  id: string;
  email: string;
  sendEnabled: boolean;
  notifyNewDomains?: boolean;
}

interface EmailSendingCardProps {
  accounts: GmailAccount[];
  orgSlug: string;
  orgId: string;
}

// Use the first connected account for notification settings
// (domain discovery runs after each account's sync)

export function EmailSendingCard({ accounts, orgSlug, orgId }: EmailSendingCardProps) {
  const router = useRouter();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isConnectingNew, setIsConnectingNew] = useState(false);

  // Find accounts that are authorized for sending
  const sendEnabledAccounts = accounts.filter(a => a.sendEnabled);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(sendEnabledAccounts[0]?.id || '');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Notification settings (applies to the first account)
  const primaryAccount = accounts[0];
  const [notifyNewDomains, setNotifyNewDomains] = useState(primaryAccount?.notifyNewDomains ?? true);

  const handleAuthorise = async (accountId: string) => {
    setIsAuthorizing(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/${accountId}/authorize-send`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start authorisation');
      }

      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (error) {
      toast.error('Failed to start authorisation');
      setIsAuthorizing(false);
    }
  };

  const handleToggleNotify = async (enabled: boolean) => {
    if (!primaryAccount) return;

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/${primaryAccount.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifyNewDomains: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      setNotifyNewDomains(enabled);
      toast.success(enabled ? 'Domain discovery emails enabled' : 'Domain discovery emails disabled');
    } catch {
      toast.error('Failed to update notification settings');
    }
  };

  const handleConnectNewAccount = async () => {
    setIsConnectingNew(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/auth-url-send`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to start authorization');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      toast.error('Failed to start authorization');
      setIsConnectingNew(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailTo) {
      toast.error('Please enter a recipient email');
      return;
    }

    if (!selectedAccountId) {
      toast.error('Please select a Gmail account');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmailTo,
          gmailAccountId: selectedAccountId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test email');
      }

      toast.success(`Test email sent to ${testEmailTo}`);
      setTestEmailTo('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    } finally {
      setIsSending(false);
    }
  };

  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Email Sending
          </CardTitle>
          <CardDescription>
            Send alerts and scheduled reports via Gmail
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Mail className="h-8 w-8 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground mb-4">
              Connect a Gmail account to send alerts and reports
            </p>
            <Button onClick={handleConnectNewAccount} disabled={isConnectingNew}>
              {isConnectingNew ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Connect Gmail for Sending
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No accounts authorized for sending yet
  if (sendEnabledAccounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Email Sending
          </CardTitle>
          <CardDescription>
            Send alerts and scheduled reports via Gmail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-md text-yellow-700 dark:text-yellow-400">
            <AlertTriangle className="h-4 w-4 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Authorisation required</p>
              <p className="text-yellow-600 dark:text-yellow-500">
                To send emails, you need to authorise a Gmail account with sending permissions.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Authorise an existing account or connect a new one:</p>
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{account.email}</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAuthorise(account.id)}
                  disabled={isAuthorizing}
                >
                  {isAuthorizing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-1" />
                  )}
                  Authorise
                </Button>
              </div>
            ))}
            <div className="pt-2 border-t mt-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleConnectNewAccount}
                disabled={isConnectingNew}
              >
                {isConnectingNew ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Connect Different Gmail Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Email Sending
        </CardTitle>
        <CardDescription>
          Send alerts and scheduled reports via Gmail
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-md text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-4 w-4 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium">Email sending is enabled</p>
            <p className="text-green-600 dark:text-green-500">
              Alerts and scheduled reports will be sent from your authorised Gmail account.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Sending Account</label>
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {sendEnabledAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Test Email Recipient</label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={testEmailTo}
                onChange={(e) => setTestEmailTo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendTestEmail()}
              />
              <Button onClick={handleSendTestEmail} disabled={isSending || !testEmailTo}>
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Send a test email to verify sending is working correctly
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Options</h4>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Domain discovery notifications</p>
                <p className="text-xs text-muted-foreground">
                  Email when new domains are found in DMARC reports
                </p>
              </div>
            </div>
            <Switch
              checked={notifyNewDomains}
              onCheckedChange={handleToggleNotify}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
