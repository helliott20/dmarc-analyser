'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Copy,
  Loader2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface DomainVerificationProps {
  domain: string;
  verificationToken: string;
  domainId: string;
  orgSlug: string;
}

export function DomainVerification({
  domain,
  verificationToken,
  domainId,
  orgSlug,
}: DomainVerificationProps) {
  const router = useRouter();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const txtRecordName = `_dmarc-verify.${domain}`;
  const txtRecordValue = verificationToken;

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/verify`,
        {
          method: 'POST',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      toast.success('Domain verified successfully!');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Verification failed. Please try again.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <CardTitle className="text-lg">Domain Verification Required</CardTitle>
        </div>
        <CardDescription>
          Add the following DNS TXT record to verify ownership of {domain}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Record Type
            </label>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">TXT</Badge>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Name / Host
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">
                {txtRecordName}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(txtRecordName, 'Record name')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-muted-foreground">
              Value
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">
                {txtRecordValue}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(txtRecordValue, 'Record value')}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            onClick={handleVerify}
            disabled={isVerifying}
            className="flex-1"
          >
            {isVerifying ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2" />
            )}
            Verify Domain
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          DNS changes can take up to 48 hours to propagate, but usually complete
          within a few minutes.
        </p>
      </CardContent>
    </Card>
  );
}
