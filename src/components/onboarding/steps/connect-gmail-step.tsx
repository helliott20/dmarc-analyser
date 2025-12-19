'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, ArrowRight, Info, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import type { StepData } from '../onboarding-wizard';
import { CENTRAL_INBOX_EMAIL } from '@/lib/constants';

interface ConnectGmailStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

// Check if this is the hosted version with central inbox
const isCentralInboxEnabled = CENTRAL_INBOX_EMAIL === 'reports@dmarcanalyser.io';

export function ConnectGmailStep({
  onNext,
  onSkip,
  stepData,
}: ConnectGmailStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleConnect = async () => {
    if (!stepData.organizationSlug) {
      toast.error('Organization not found');
      return;
    }

    setIsConnecting(true);

    try {
      // Get Gmail OAuth URL
      const response = await fetch(
        `/api/orgs/${stepData.organizationSlug}/gmail/auth-url`,
        { method: 'POST' }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get authorization URL');
      }

      const { url } = await response.json();

      // Redirect to Gmail OAuth
      window.location.href = url;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to connect Gmail'
      );
      setIsConnecting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  // Hosted version: Simple DNS setup with central inbox
  if (isCentralInboxEnabled) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Set Up DMARC Report Collection</h2>
          <p className="text-muted-foreground">
            Add our email to your DMARC record to start receiving reports
          </p>
        </div>

        {/* Simple instructions */}
        <div className="space-y-4 max-w-md mx-auto">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <h4 className="font-semibold">Add this email to your DMARC record</h4>
            <div className="flex items-center gap-2">
              <div className="flex-1 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm">
                <span className="text-green-400">{CENTRAL_INBOX_EMAIL}</span>
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(CENTRAL_INBOX_EMAIL)}
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Your DMARC record should look like this:
            </p>
            <div className="p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm overflow-x-auto">
              <div>
                <span className="text-slate-500">Record:</span> <span className="text-blue-400">_dmarc.{stepData.domain || 'yourdomain.com'}</span>
              </div>
              <div>
                <span className="text-slate-500">Type:</span> <span className="text-yellow-400">TXT</span>
              </div>
              <div>
                <span className="text-slate-500">Value:</span> <span className="text-slate-300">v=DMARC1; p=none; rua=mailto:</span><span className="text-green-400">{CENTRAL_INBOX_EMAIL}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="space-y-3 max-w-md mx-auto bg-muted/50 p-4 rounded-lg">
          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">No Account Setup Needed</p>
              <p className="text-sm text-muted-foreground">
                Just update your DNS - reports are automatically collected and processed
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">Reports Arrive Automatically</p>
              <p className="text-sm text-muted-foreground">
                We check for new reports every 15 minutes
              </p>
            </div>
          </div>
        </div>

        {/* Timeline info */}
        <div className="max-w-md mx-auto flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Reports typically start arriving within 24-48 hours after updating your DNS. Major providers like Google, Microsoft, and Yahoo send daily aggregate reports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 max-w-md mx-auto pt-4">
          <Button onClick={() => onNext()} className="flex-1">
            Continue
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground max-w-md mx-auto mt-4">
          Want to use your own Gmail account instead?{' '}
          <button
            onClick={onSkip}
            className="text-primary hover:underline"
          >
            Set up custom Gmail integration
          </button>
          {' '}in settings after onboarding.
        </p>
      </div>
    );
  }

  // Self-hosted version: Gmail connection flow
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Set Up DMARC Report Collection</h2>
        <p className="text-muted-foreground">
          Connect a Gmail account to receive and automatically import DMARC reports
        </p>
      </div>

      {/* Step 1: Connect Gmail */}
      <div className="space-y-3 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">1</div>
          <h3 className="font-semibold">Connect Your Gmail Account</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-8">
          This is the email address where DMARC reports will be sent. Choose an account you have access to - it can be a dedicated reporting address or your regular email.
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3 max-w-md mx-auto bg-muted/50 p-4 rounded-lg">
        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Automatic Import</p>
            <p className="text-sm text-muted-foreground">
              Reports are automatically parsed and imported - no manual uploads
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Privacy Protected</p>
            <p className="text-sm text-muted-foreground">
              We only read DMARC report emails, never your personal messages
            </p>
          </div>
        </div>
      </div>

      {/* Step 2: Configure DMARC */}
      <div className="space-y-3 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">2</div>
          <h3 className="font-semibold">Update Your DMARC DNS Record</h3>
        </div>
        <p className="text-sm text-muted-foreground ml-8">
          After connecting Gmail, add the <code className="bg-muted px-1 rounded">rua</code> tag to your domain&apos;s DMARC record to tell email providers where to send reports:
        </p>
        <div className="ml-8 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm overflow-x-auto">
          <span className="text-slate-400">v=DMARC1; p=none;</span> rua=mailto:<span className="text-green-400">your-email@gmail.com</span>
        </div>
        <div className="ml-8 flex gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800 dark:text-blue-300">
            Reports typically start arriving within 24-48 hours after updating your DNS. Major providers like Google, Microsoft, and Yahoo send daily aggregate reports.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 max-w-md mx-auto pt-4">
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={isConnecting}
          className="flex-1"
        >
          Skip for Now
        </Button>
        <Button onClick={handleConnect} disabled={isConnecting} className="flex-1">
          {isConnecting ? (
            <>Connecting...</>
          ) : (
            <>
              Connect Gmail
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground max-w-md mx-auto">
        You can always connect Gmail later from your organization settings
      </p>
    </div>
  );
}
