'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';

interface SourcesEnrichmentProps {
  orgSlug: string;
  domainId: string;
  unenrichedCount: number;
}

export function SourcesEnrichment({
  orgSlug,
  domainId,
  unenrichedCount,
}: SourcesEnrichmentProps) {
  const router = useRouter();
  const [isEnriching, setIsEnriching] = useState(false);
  const [remaining, setRemaining] = useState(unenrichedCount);

  const handleEnrich = async () => {
    setIsEnriching(true);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/sources/enrich`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to enrich');
      }

      const data = await response.json();

      if (data.enriched > 0) {
        toast.success(data.message);
        setRemaining(data.remaining);
        router.refresh();
      } else {
        toast.info(data.message);
      }

      // If there are more to enrich, show option to continue
      if (data.hasMore) {
        toast.info(`${data.remaining} sources remaining. Click again to continue.`);
      }
    } catch (error) {
      toast.error('Failed to enrich sources');
    } finally {
      setIsEnriching(false);
    }
  };

  if (remaining === 0) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleEnrich}
      disabled={isEnriching}
    >
      {isEnriching ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Enriching...
        </>
      ) : (
        <>
          <MapPin className="h-4 w-4 mr-2" />
          Enrich {remaining} IP{remaining > 1 ? 's' : ''}
        </>
      )}
    </Button>
  );
}
