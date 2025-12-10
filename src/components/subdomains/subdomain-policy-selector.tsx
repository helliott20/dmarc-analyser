'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface SubdomainPolicySelectorProps {
  subdomainId: string;
  currentPolicy: string | null;
  orgSlug: string;
  domainId: string;
}

export function SubdomainPolicySelector({
  subdomainId,
  currentPolicy,
  orgSlug,
  domainId,
}: SubdomainPolicySelectorProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handlePolicyChange = async (value: string) => {
    setIsUpdating(true);

    try {
      const policyValue = value === 'default' ? null : value;

      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/subdomains/${subdomainId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            policyOverride: policyValue,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update policy');
      }

      toast.success('Policy override updated successfully');
      router.refresh();
    } catch (error) {
      console.error('Failed to update policy:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update policy'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  const displayValue = currentPolicy || 'default';

  return (
    <Select
      value={displayValue}
      onValueChange={handlePolicyChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue placeholder="Select policy" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default">Default</SelectItem>
        <SelectItem value="none">None</SelectItem>
        <SelectItem value="quarantine">Quarantine</SelectItem>
        <SelectItem value="reject">Reject</SelectItem>
      </SelectContent>
    </Select>
  );
}
