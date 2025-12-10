'use client';

import { Button } from '@/components/ui/button';
import { Shield, TrendingUp, Bell, Lock } from 'lucide-react';
import type { StepData } from '../onboarding-wizard';

interface WelcomeStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-10 w-10 text-primary" />
          </div>
        </div>
        <h2 className="text-3xl font-bold">Welcome to DMARC Analyser</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Protect your email domain from spoofing and phishing attacks with
          comprehensive DMARC monitoring and reporting.
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Email Authentication</h3>
            <p className="text-sm text-muted-foreground">
              Monitor DMARC, SPF, and DKIM authentication results to ensure your
              emails are properly authenticated.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Real-time Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Track email sources, pass rates, and identify potential threats
              with detailed analytics and charts.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Smart Alerts</h3>
            <p className="text-sm text-muted-foreground">
              Get notified about suspicious activity, authentication failures,
              and policy violations.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Secure by Default</h3>
            <p className="text-sm text-muted-foreground">
              Enterprise-grade security with team collaboration, audit logs, and
              role-based access control.
            </p>
          </div>
        </div>
      </div>

      {/* What's Next */}
      <div className="bg-muted p-6 rounded-lg">
        <h3 className="font-semibold mb-3">What happens next?</h3>
        <p className="text-sm text-muted-foreground mb-4">
          We'll guide you through a quick setup process to get you started:
        </p>
        <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-2 ml-2">
          <li>Create your organization</li>
          <li>Add your first domain</li>
          <li>Verify domain ownership</li>
          <li>Connect Gmail for automatic report import (optional)</li>
        </ol>
      </div>

      {/* CTA */}
      <div className="flex justify-center pt-4">
        <Button size="lg" onClick={() => onNext()}>
          Get Started
        </Button>
      </div>
    </div>
  );
}
