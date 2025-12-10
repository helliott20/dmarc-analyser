'use client';

import { useState } from 'react';
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
import { Send, Loader2, Mail, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface GmailAccount {
  id: string;
  email: string;
}

interface EmailSendingCardProps {
  accounts: GmailAccount[];
  orgSlug: string;
}

export function EmailSendingCard({ accounts, orgSlug }: EmailSendingCardProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [testEmailTo, setTestEmailTo] = useState('');
  const [isSending, setIsSending] = useState(false);

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
          <div className="text-center py-4 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Connect a Gmail account above to enable email sending</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

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
              Alerts and scheduled reports will be sent from your connected Gmail account.
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
                {accounts.map((account) => (
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
      </CardContent>
    </Card>
  );
}
