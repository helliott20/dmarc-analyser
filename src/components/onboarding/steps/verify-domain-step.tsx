'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Copy, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { StepData } from '../onboarding-wizard';

interface VerifyDomainStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

export function VerifyDomainStep({
  onNext,
  onSkip,
  stepData,
}: VerifyDomainStepProps) {
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    // Generate or fetch verification token
    if (stepData.domainId && stepData.organizationSlug) {
      // In a real implementation, this would be from the domain creation response
      // For now, we'll generate a random token
      const token = `dmarc-verify-${Math.random().toString(36).substring(2, 15)}`;
      setVerificationToken(token);
    }
  }, [stepData.domainId, stepData.organizationSlug]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleVerify = async () => {
    if (!stepData.domainId || !stepData.organizationSlug) {
      toast.error('Domain information not found');
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch(
        `/api/orgs/${stepData.organizationSlug}/domains/${stepData.domainId}/verify`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Verification failed');
      }

      setIsVerified(true);
      toast.success('Domain verified successfully!');

      // Auto-proceed after a short delay
      setTimeout(() => {
        onNext();
      }, 2000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Verification failed'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // If no domain was added, show skip option
  if (!stepData.domainId) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              <ShieldCheck className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Domain Verification</h2>
          <p className="text-muted-foreground">
            No domain was added in the previous step. You can add and verify domains
            later from your dashboard.
          </p>
        </div>
        <div className="flex justify-center pt-4">
          <Button onClick={onSkip}>Continue</Button>
        </div>
      </div>
    );
  }

  if (isVerified) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Domain Verified!</h2>
          <p className="text-muted-foreground">
            Your domain <strong>{stepData.domain}</strong> has been successfully
            verified.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Verify Domain Ownership</h2>
        <p className="text-muted-foreground">
          Add a DNS TXT record to verify you own this domain
        </p>
      </div>

      {/* Domain Info */}
      <Card className="p-4 max-w-md mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Domain</p>
            <p className="font-medium">{stepData.domain}</p>
          </div>
          <Badge variant="secondary">Unverified</Badge>
        </div>
      </Card>

      {/* Instructions */}
      <div className="space-y-4 max-w-md mx-auto">
        <div className="space-y-3">
          <h3 className="font-semibold">Step 1: Add DNS TXT Record</h3>
          <p className="text-sm text-muted-foreground">
            Add the following TXT record to your domain&apos;s DNS settings:
          </p>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Name/Host</p>
                <code className="text-sm font-mono">
                  _dmarc-verification.{stepData.domain}
                </code>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  copyToClipboard(`_dmarc-verification.${stepData.domain}`)
                }
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Type</p>
                <code className="text-sm font-mono">TXT</code>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Value</p>
                <code className="text-sm font-mono break-all">
                  {verificationToken}
                </code>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(verificationToken)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Step 2: Verify</h3>
          <p className="text-sm text-muted-foreground">
            After adding the DNS record, click the verify button below. DNS changes
            may take a few minutes to propagate.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg flex gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <strong>Note:</strong> DNS propagation can take 5-60 minutes. You can
            skip this step and verify your domain later from the domain settings.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isVerifying}
            className="flex-1"
          >
            Verify Later
          </Button>
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex-1"
          >
            {isVerifying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Verify Now
          </Button>
        </div>
      </div>
    </div>
  );
}
