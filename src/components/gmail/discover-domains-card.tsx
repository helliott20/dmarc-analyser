'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2, Globe, CheckCircle, X, RefreshCw, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface DomainSuggestion {
  domain: string;
  reportCount: number;
}

interface DiscoverDomainsCardProps {
  orgSlug: string;
}

export function DiscoverDomainsCard({ orgSlug }: DiscoverDomainsCardProps) {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [suggestions, setSuggestions] = useState<DomainSuggestion[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [addingDomain, setAddingDomain] = useState<string | null>(null);
  const [addedDomains, setAddedDomains] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [gmailAccountId, setGmailAccountId] = useState<string | null>(null);

  // Fetch Gmail account ID on mount
  useEffect(() => {
    async function fetchGmailAccount() {
      try {
        const response = await fetch(`/api/orgs/${orgSlug}/gmail`);
        if (response.ok) {
          const accounts = await response.json();
          if (accounts.length > 0) {
            setGmailAccountId(accounts[0].id);
          }
        }
      } catch {
        // No Gmail account connected
      }
    }
    fetchGmailAccount();
  }, [orgSlug]);

  const handleScan = async () => {
    if (!gmailAccountId) return;

    setScanning(true);

    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/gmail/${gmailAccountId}/discover-domains`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to scan emails');
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      setHasScanned(true);

      if (data.suggestions.length === 0) {
        toast.info('No new domains found in DMARC reports');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to scan');
    } finally {
      setScanning(false);
    }
  };

  const handleAddDomain = async (domain: string) => {
    setAddingDomain(domain);

    try {
      const response = await fetch(`/api/orgs/${orgSlug}/domains`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add domain');
      }

      setAddedDomains(prev => new Set([...prev, domain]));
      setSuggestions(prev => prev.filter(s => s.domain !== domain));
      toast.success(`Added ${domain}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add domain');
    } finally {
      setAddingDomain(null);
    }
  };

  const handleAddAll = async () => {
    for (const suggestion of suggestions) {
      if (!addedDomains.has(suggestion.domain)) {
        await handleAddDomain(suggestion.domain);
      }
    }
  };

  // Don't show if dismissed or no Gmail connected
  if (dismissed || !gmailAccountId) {
    return null;
  }

  // Show scan button if not scanned yet
  if (!hasScanned) {
    return (
      <Card className="border-dashed border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-sm">Discover domains from DMARC reports</p>
                <p className="text-xs text-muted-foreground">
                  Scan your Gmail for domains you&apos;re receiving reports for
                </p>
              </div>
            </div>
            <Button size="sm" onClick={handleScan} disabled={scanning}>
              {scanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Scan Gmail
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No suggestions found
  if (suggestions.length === 0) {
    return null;
  }

  // Show suggestions
  return (
    <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-green-600" />
            {suggestions.length} domain{suggestions.length !== 1 ? 's' : ''} found in DMARC reports
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleScan} disabled={scanning}>
              <RefreshCw className={`h-4 w-4 ${scanning ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.domain}
              className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{suggestion.domain}</span>
                <Badge variant="secondary" className="text-xs">
                  {suggestion.reportCount} report{suggestion.reportCount !== 1 ? 's' : ''}
                </Badge>
              </div>
              {addedDomains.has(suggestion.domain) ? (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="h-3 w-3" />
                  Added
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddDomain(suggestion.domain)}
                  disabled={addingDomain === suggestion.domain}
                >
                  {addingDomain === suggestion.domain ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1" />
                      Add
                    </>
                  )}
                </Button>
              )}
            </div>
          ))}
        </div>
        {suggestions.length > 1 && (
          <div className="mt-3 pt-3 border-t">
            <Button
              size="sm"
              onClick={handleAddAll}
              disabled={addingDomain !== null}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add All {suggestions.length} Domains
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
