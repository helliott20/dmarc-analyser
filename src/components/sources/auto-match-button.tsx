'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface AutoMatchButtonProps {
  orgSlug: string;
  domainId: string;
}

export function AutoMatchButton({ orgSlug, domainId }: AutoMatchButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAutoMatch = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/sources/match`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to match sources');
      }

      const result = await response.json();

      if (result.matched > 0) {
        toast.success(
          `Matched ${result.matched} source${result.matched > 1 ? 's' : ''} to known senders`
        );
      } else {
        toast.info('No new matches found');
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleAutoMatch} disabled={loading} variant="outline">
      <Sparkles className="h-4 w-4 mr-2" />
      {loading ? 'Matching...' : 'Auto-Match'}
    </Button>
  );
}
