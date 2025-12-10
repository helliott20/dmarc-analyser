'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { StepData } from '../onboarding-wizard';

interface CreateOrgStepProps {
  onNext: (data?: Partial<StepData>) => void;
  onBack: () => void;
  onSkip: () => void;
  stepData: StepData;
  isFirstStep: boolean;
  isLastStep: boolean;
  canSkip: boolean;
}

export function CreateOrgStep({ onNext, stepData }: CreateOrgStepProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === generateSlug(name)) {
      setSlug(generateSlug(value));
    }
  };

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 50);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !slug.trim()) {
      toast.error('Organization name and URL are required');
      return;
    }

    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      toast.error('URL must only contain lowercase letters, numbers, and hyphens');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create organization');
      }

      const org = await response.json();
      toast.success('Organization created successfully!');

      onNext({
        organizationId: org.id,
        organizationSlug: org.slug,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create organization'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Skip to next if already has org
  if (stepData.organizationId) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Organization Ready</h2>
          <p className="text-muted-foreground">
            You already have an organization set up. Let&apos;s continue with adding a
            domain.
          </p>
        </div>
        <div className="flex justify-center pt-4">
          <Button onClick={() => onNext()}>Continue</Button>
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
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h2 className="text-2xl font-bold">Create Your Organization</h2>
        <p className="text-muted-foreground">
          An organization is a workspace where you can manage domains, invite team
          members, and monitor DMARC reports.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto">
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name</Label>
          <Input
            id="name"
            placeholder="Acme Inc."
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            disabled={isSubmitting}
            required
          />
          <p className="text-xs text-muted-foreground">
            This is your organization&apos;s display name
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Organization URL</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">/orgs/</span>
            <Input
              id="slug"
              placeholder="acme-inc"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              disabled={isSubmitting}
              required
              className="flex-1"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A unique URL for your organization (lowercase, numbers, and hyphens only)
          </p>
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full" size="lg">
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Organization
        </Button>
      </form>

      {/* Info */}
      <div className="bg-muted p-4 rounded-lg max-w-md mx-auto">
        <p className="text-sm text-muted-foreground">
          <strong>Note:</strong> You can create multiple organizations later if you
          need to manage domains for different companies or departments.
        </p>
      </div>
    </div>
  );
}
