'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, X } from 'lucide-react';
import { WelcomeStep } from './steps/welcome-step';
import { CreateOrgStep } from './steps/create-org-step';
import { AddDomainStep } from './steps/add-domain-step';
import { VerifyDomainStep } from './steps/verify-domain-step';
import { ConnectGmailStep } from './steps/connect-gmail-step';
import { CompleteStep } from './steps/complete-step';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

export interface StepData {
  organizationId?: string;
  organizationSlug?: string;
  domainId?: string;
  domain?: string;
  gmailConnected?: boolean;
}

export function OnboardingWizard({ onComplete, onSkip }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<StepData>({});

  const steps = [
    { name: 'Welcome', component: WelcomeStep, skippable: false },
    { name: 'Create Organization', component: CreateOrgStep, skippable: false },
    { name: 'Add Domain', component: AddDomainStep, skippable: true },
    { name: 'Verify Domain', component: VerifyDomainStep, skippable: true },
    { name: 'Connect Gmail', component: ConnectGmailStep, skippable: true },
    { name: 'Complete', component: CompleteStep, skippable: false },
  ];

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = (data?: Partial<StepData>) => {
    if (data) {
      setStepData((prev) => ({ ...prev, ...data }));
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkipStep = () => {
    if (steps[currentStep].skippable) {
      handleNext();
    }
  };

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Get Started with DMARC Analyser</h1>
          <Button variant="ghost" size="icon" onClick={onSkip}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-between mt-6">
          {steps.map((step, index) => (
            <div
              key={step.name}
              className="flex flex-col items-center gap-2 flex-1"
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < currentStep
                    ? 'bg-primary text-primary-foreground'
                    : index === currentStep
                    ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`text-xs text-center hidden sm:block ${
                  index === currentStep
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="transition-opacity duration-300">
        <Card>
          <CardContent className="pt-6">
            <CurrentStepComponent
              onNext={handleNext}
              onBack={handleBack}
              onSkip={handleSkipStep}
              stepData={stepData}
              isFirstStep={currentStep === 0}
              isLastStep={currentStep === steps.length - 1}
              canSkip={steps[currentStep].skippable}
            />
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2">
          {steps[currentStep].skippable && (
            <Button variant="outline" onClick={handleSkipStep}>
              Skip
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
