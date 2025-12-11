'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Globe,
  CheckCircle2,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldX,
  ShieldAlert,
  Loader2,
} from 'lucide-react';
import { VolumeBar } from '@/components/domains/volume-bar';

interface Domain {
  id: string;
  domain: string;
  displayName: string | null;
  verifiedAt: Date | null;
}

interface DomainWithStats extends Domain {
  isActive?: boolean;
  totalMessages?: number;
  passedMessages?: number;
  failedMessages?: number;
  passRate?: number;
  volumePercent?: number;
}

interface DomainsListProps {
  domains: Domain[];
  orgSlug: string;
  showVolumeBar?: boolean;
}

interface DnsStatus {
  spf: { valid: boolean; record: string | null };
  dkim: { valid: boolean; selectors: string[] };
  dmarc: { valid: boolean; record: string | null };
}

const PAGE_SIZE = 20;

// DNS Status Badge component that fetches live DNS status
function DnsStatusBadges({ domainId, orgSlug }: { domainId: string; orgSlug: string }) {
  const [status, setStatus] = useState<DnsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url = `/api/orgs/${orgSlug}/domains/${domainId}/dns-status`;

    async function fetchDnsStatus() {
      try {
        const res = await fetch(url);
        if (cancelled) return;

        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setStatus(data);
          }
        } else {
          if (!cancelled) {
            setError(`HTTP ${res.status}`);
          }
        }
      } catch (err) {
        if (!cancelled && err instanceof Error) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchDnsStatus();

    return () => {
      cancelled = true;
    };
  }, [domainId, orgSlug]);

  if (loading) {
    return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  }

  if (error || !status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <ShieldAlert className="h-4 w-4 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{error || 'Failed to load DNS status'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const hasSpf = status.spf.valid;
  const hasDkim = status.dkim.valid;
  const hasDmarc = status.dmarc.valid;
  const allValid = hasSpf && hasDkim && hasDmarc;
  const noneValid = !hasSpf && !hasDkim && !hasDmarc;

  return (
    <TooltipProvider>
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`p-1 rounded ${hasSpf ? 'text-green-600' : 'text-red-500'}`}>
              <span className="text-xs font-medium">SPF</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">SPF: {hasSpf ? 'Valid' : 'Missing'}</p>
            {status.spf.record && (
              <p className="text-xs text-muted-foreground max-w-xs truncate">{status.spf.record}</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`p-1 rounded ${hasDkim ? 'text-green-600' : 'text-yellow-500'}`}>
              <span className="text-xs font-medium">DKIM</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">DKIM: {hasDkim ? 'Found' : 'Not detected'}</p>
            {status.dkim.selectors.length > 0 ? (
              <p className="text-xs text-muted-foreground">Selectors: {status.dkim.selectors.join(', ')}</p>
            ) : (
              <p className="text-xs text-muted-foreground">No common selectors found</p>
            )}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`p-1 rounded ${hasDmarc ? 'text-green-600' : 'text-red-500'}`}>
              <span className="text-xs font-medium">DMARC</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-medium">DMARC: {hasDmarc ? 'Valid' : 'Missing'}</p>
            {status.dmarc.record && (
              <p className="text-xs text-muted-foreground max-w-xs truncate">{status.dmarc.record}</p>
            )}
          </TooltipContent>
        </Tooltip>

        {allValid && (
          <ShieldCheck className="h-4 w-4 text-green-600 ml-1" />
        )}
        {noneValid && (
          <ShieldX className="h-4 w-4 text-red-500 ml-1" />
        )}
        {!allValid && !noneValid && (
          <ShieldAlert className="h-4 w-4 text-yellow-500 ml-1" />
        )}
      </div>
    </TooltipProvider>
  );
}

export function DomainsList({ domains, orgSlug, showVolumeBar = false }: DomainsListProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [domainStats, setDomainStats] = useState<Map<string, DomainWithStats>>(new Map());
  const [statsLoading, setStatsLoading] = useState(false);

  // Fetch domain stats if showVolumeBar is enabled
  useEffect(() => {
    if (!showVolumeBar) return;

    async function fetchStats() {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/domains/stats`);
        if (res.ok) {
          const data = await res.json();
          const statsMap = new Map<string, DomainWithStats>();
          for (const domain of data.domains) {
            statsMap.set(domain.id, domain);
          }
          setDomainStats(statsMap);
        }
      } catch (error) {
        console.error('Failed to fetch domain stats:', error);
      } finally {
        setStatsLoading(false);
      }
    }

    fetchStats();
  }, [orgSlug, showVolumeBar]);

  const filteredDomains = useMemo(() => {
    if (!search.trim()) return domains;
    const query = search.toLowerCase();
    return domains.filter(
      (d) =>
        d.domain.toLowerCase().includes(query) ||
        d.displayName?.toLowerCase().includes(query)
    );
  }, [domains, search]);

  const totalPages = Math.ceil(filteredDomains.length / PAGE_SIZE);
  const paginatedDomains = filteredDomains.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // Reset page when search changes
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      {domains.length > 10 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search domains..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* List */}
      <div className="divide-y">
        {paginatedDomains.map((domain) => {
          const stats = domainStats.get(domain.id);

          return (
            <Link
              key={domain.id}
              href={`/orgs/${orgSlug}/domains/${domain.id}`}
              className="flex items-center justify-between py-4 hover:bg-muted/50 -mx-4 px-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{domain.domain}</p>
                  {domain.displayName && domain.displayName !== domain.domain && (
                    <p className="text-sm text-muted-foreground">
                      {domain.displayName}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <DnsStatusBadges domainId={domain.id} orgSlug={orgSlug} />
                {/* Volume Bar - after record status */}
                {showVolumeBar && (
                  <div className="hidden md:block">
                    {statsLoading ? (
                      <div className="w-32 h-3 bg-muted rounded-full animate-pulse" />
                    ) : stats ? (
                      <VolumeBar
                        volumePercent={stats.volumePercent || 0}
                        totalMessages={stats.totalMessages || 0}
                        passedMessages={stats.passedMessages || 0}
                        failedMessages={stats.failedMessages || 0}
                        passRate={stats.passRate || 0}
                      />
                    ) : (
                      <div className="w-32 h-3 bg-muted/30 rounded-full" />
                    )}
                  </div>
                )}
                {domain.verifiedAt ? (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-warning">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDomains.length === 0 && search && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No domains match &quot;{search}&quot;</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, filteredDomains.length)} of{' '}
            {filteredDomains.length} domains
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
