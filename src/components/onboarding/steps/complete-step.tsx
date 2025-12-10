'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2, ArrowRight, Globe, Mail, FileText, Settings } from 'lucide-react';
import Link from 'next/link';
import type { StepData } from '../onboarding-wizard';

interface CompleteStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

export function CompleteStep({ onNext, stepData }: CompleteStepProps) {
  return (
    <div className="space-y-8">
      {/* Success Header */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">You&apos;re All Set!</h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Your DMARC Analyzer account is ready. Here&apos;s what you&apos;ve accomplished:
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 max-w-md mx-auto">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium">Organization Created</p>
              <p className="text-sm text-muted-foreground">
                Your workspace is ready for team collaboration
              </p>
            </div>
          </div>
        </Card>

        {stepData.domainId && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Domain Added</p>
                <p className="text-sm text-muted-foreground">
                  {stepData.domain} is being monitored
                </p>
              </div>
            </div>
          </Card>
        )}

        {stepData.gmailConnected && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Gmail Connected</p>
                <p className="text-sm text-muted-foreground">
                  Reports will be imported automatically
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Next Steps */}
      <div className="space-y-4 max-w-md mx-auto">
        <h3 className="font-semibold text-center">Next Steps</h3>

        <div className="space-y-3">
          <Card className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Configure DMARC Record</h4>
                <p className="text-sm text-muted-foreground">
                  Update your DNS to send DMARC reports to your Gmail or a dedicated
                  email address
                </p>
              </div>
            </div>
          </Card>

          {!stepData.gmailConnected && (
            <Card className="p-4 hover:border-primary/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium mb-1">Connect Gmail</h4>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic report import from your Gmail inbox
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Review Documentation</h4>
                <p className="text-sm text-muted-foreground">
                  Learn best practices for DMARC implementation and monitoring
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4 hover:border-primary/50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium mb-1">Set Up Alerts</h4>
                <p className="text-sm text-muted-foreground">
                  Configure notifications for authentication failures and suspicious
                  activity
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <Button size="lg" onClick={() => onNext()} className="min-w-[200px]">
          Go to Dashboard
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>

        {stepData.organizationSlug && (
          <Link
            href={`/orgs/${stepData.organizationSlug}/settings`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            or visit organization settings
          </Link>
        )}
      </div>
    </div>
  );
}
