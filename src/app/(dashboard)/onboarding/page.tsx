'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { toast } from 'sonner';

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user needs onboarding
    const checkOnboardingStatus = async () => {
      try {
        const response = await fetch('/api/user/onboarding');
        if (response.ok) {
          const data = await response.json();

          // If user doesn't need onboarding, redirect to orgs
          if (!data.needsOnboarding) {
            router.push('/orgs');
            return;
          }
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to check onboarding status:', error);
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [router]);

  const handleComplete = async () => {
    try {
      // Mark onboarding as complete
      await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed: true }),
      });

      toast.success('Welcome to DMARC Analyzer!');
      router.push('/orgs');
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast.error('Failed to complete onboarding');
    }
  };

  const handleSkip = () => {
    router.push('/orgs');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <OnboardingWizard onComplete={handleComplete} onSkip={handleSkip} />
    </div>
  );
}
