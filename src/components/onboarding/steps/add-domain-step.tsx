'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Globe, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StepData } from '../onboarding-wizard';

interface AddDomainStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

export function AddDomainStep({ onNext, onSkip, stepData }: AddDomainStepProps) {
  const [domain, setDomain] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!domain.trim()) {
      toast.error('Domain is required');
      return;
    }

    // Basic domain validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain.trim())) {
      toast.error('Please enter a valid domain (e.g., example.com)');
      return;
    }

    if (!stepData.organizationSlug) {
      toast.error('Organization not found. Please go back and create an organization.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/orgs/${stepData.organizationSlug}/domains`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain.trim().toLowerCase(),
          displayName: displayName.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add domain');
      }

      const domainData = await response.json();
      toast.success('Domain added successfully!');

      onNext({
        domainId: domainData.id,
        domain: domainData.domain,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to add domain'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center mb-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Add Your First Domain</h2>
        <p className="text-muted-foreground">
          Start monitoring DMARC reports for your email domain. You can add more
          domains later.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="domain">Domain</Label>
          <Input
            id="domain"
            placeholder="example.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            Enter your root domain without www or subdomains
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name (optional)</Label>
          <Input
            id="displayName"
            placeholder="My Company"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="text-xs text-muted-foreground">
            A friendly name to help identify this domain
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSkip}
            disabled={isSubmitting}
            className="flex-1"
          >
            Skip for Now
          </Button>
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Domain
          </Button>
        </div>
      </form>

      {/* Examples */}
      <div className="bg-muted p-4 rounded-lg max-w-md mx-auto">
        <h4 className="font-medium mb-2 text-sm">Examples:</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span> example.com
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-600">✓</span> my-company.co.uk
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-600">✗</span> www.example.com
          </li>
          <li className="flex items-center gap-2">
            <span className="text-red-600">✗</span> mail.example.com
          </li>
        </ul>
      </div>
    </div>
  );
}
