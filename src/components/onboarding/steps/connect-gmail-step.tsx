'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import type { StepData } from '../onboarding-wizard';

interface ConnectGmailStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

export function ConnectGmailStep({
  onNext,
  onSkip,
  stepData,
}: ConnectGmailStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    if (!stepData.organizationSlug) {
      toast.error('Organization not found');
      return;
    }

    setIsConnecting(true);

    try {
      // Get Gmail OAuth URL
      const response = await fetch(
        `/api/orgs/${stepData.organizationSlug}/gmail/auth-url`
      );

      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Connect Gmail (Optional)</h2>
        <p className="text-muted-foreground">
          Automatically import DMARC reports from your Gmail inbox
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3 max-w-md mx-auto">
        <h3 className="font-semibold text-center mb-4">Why Connect Gmail?</h3>

        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Automatic Import</p>
            <p className="text-sm text-muted-foreground">
              DMARC reports are automatically imported from your inbox, no manual
              upload needed
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Real-time Updates</p>
            <p className="text-sm text-muted-foreground">
              Get the latest DMARC data as soon as reports arrive in your inbox
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Organized Inbox</p>
            <p className="text-sm text-muted-foreground">
              Processed reports can be automatically labeled and archived
            </p>
          </div>
        </div>
      </div>

      {/* Privacy Note */}
      <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg max-w-md mx-auto">
        <h4 className="font-medium text-blue-900 mb-2 text-sm">Privacy Note</h4>
        <p className="text-sm text-blue-800">
          We only access emails matching DMARC report patterns (subject containing
          &quot;DMARC&quot; and &quot;Report&quot;). Your regular emails are never
          accessed or read.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-3 max-w-md mx-auto">
        <h3 className="font-semibold">How it works:</h3>
        <ol className="space-y-2 text-sm text-muted-foreground">
          <li className="flex gap-2">
            <span className="font-medium text-foreground">1.</span>
            <span>
              You&apos;ll be redirected to Google to grant read-only access to your
              Gmail
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">2.</span>
            <span>
              We&apos;ll search for DMARC aggregate reports in your inbox
            </span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">3.</span>
            <span>Reports are parsed and imported into your dashboard</span>
          </li>
          <li className="flex gap-2">
            <span className="font-medium text-foreground">4.</span>
            <span>
              Optionally, processed emails are labeled for easy organization
            </span>
          </li>
        </ol>
      </div>

      {/* DMARC Configuration Info */}
      <div className="bg-muted p-4 rounded-lg max-w-md mx-auto">
        <h4 className="font-medium mb-2 text-sm">Don&apos;t forget to configure your DMARC record!</h4>
        <p className="text-sm text-muted-foreground mb-2">
          To receive reports, update your domain&apos;s DMARC DNS record with the
          RUA tag:
        </p>
        <code className="text-xs bg-background p-2 rounded block">
          v=DMARC1; p=none; rua=mailto:your-email@gmail.com
        </code>
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
