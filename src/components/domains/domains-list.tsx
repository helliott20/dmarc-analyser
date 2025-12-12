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
import { cn } from '@/lib/utils';

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

// Grid column configuration for consistent alignment
// Mobile: Domain + Status only
// Tablet (md): Domain + DNS Records + Status
// Desktop (lg): Domain + DNS Records + 7-Day Volume + Status
const GRID_COLUMNS = {
  base: 'grid-cols-[1fr_auto]',
  md: 'md:grid-cols-[1fr_auto_auto]',
  lg: 'lg:grid-cols-[1fr_auto_minmax(180px,1fr)_auto]',
};

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
    return (
      <div className="flex items-center justify-center w-[120px]">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading DNS status" />
      </div>
    );
  }

  if (error || !status) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-[120px]">
              <ShieldAlert className="h-4 w-4 text-muted-foreground cursor-help" aria-label="DNS status unavailable" />
            </div>
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
      <div className="flex items-center justify-center gap-1 w-[120px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('p-1 rounded', hasSpf ? 'text-success' : 'text-destructive')}>
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
            <div className={cn('p-1 rounded', hasDkim ? 'text-success' : 'text-warning')}>
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
            <div className={cn('p-1 rounded', hasDmarc ? 'text-success' : 'text-destructive')}>
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
          <ShieldCheck className="h-4 w-4 text-success ml-1" aria-label="All DNS records valid" />
        )}
        {noneValid && (
          <ShieldX className="h-4 w-4 text-destructive ml-1" aria-label="No DNS records configured" />
        )}
        {!allValid && !noneValid && (
          <ShieldAlert className="h-4 w-4 text-warning ml-1" aria-label="Some DNS records missing" />
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
    let result = domains;

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.domain.toLowerCase().includes(query) ||
          d.displayName?.toLowerCase().includes(query)
      );
    }

    // Sort by volume (descending) when stats are loaded, otherwise alphabetically
    if (showVolumeBar && domainStats.size > 0) {
      result = [...result].sort((a, b) => {
        const aStats = domainStats.get(a.id);
        const bStats = domainStats.get(b.id);
        const aVolume = aStats?.totalMessages ?? 0;
        const bVolume = bStats?.totalMessages ?? 0;
        return bVolume - aVolume; // Descending order
      });
    }

    return result;
  }, [domains, search, showVolumeBar, domainStats]);

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

  // Build grid class based on whether volume bar is shown
  const gridClass = showVolumeBar
    ? cn('grid items-center gap-4', GRID_COLUMNS.base, GRID_COLUMNS.md, GRID_COLUMNS.lg)
    : cn('grid items-center gap-4', GRID_COLUMNS.base, GRID_COLUMNS.md);

  return (
    <div className="space-y-4">
      {/* Search */}
      {domains.length > 10 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Search domains..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
            aria-label="Search domains"
          />
        </div>
      )}

      {/* Column Headers */}
      {paginatedDomains.length > 0 && (
        <div
          className={cn(
            gridClass,
            'px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b'
          )}
          role="row"
          aria-hidden="true"
        >
          <div>Domain</div>
          <div className="hidden md:block text-center">DNS Records</div>
          {showVolumeBar && (
            <div className="hidden lg:block text-center">7-Day Volume</div>
          )}
          <div className="text-right">Status</div>
        </div>
      )}

      {/* Domain Rows */}
      <div className="divide-y" role="list" aria-label="Domains list">
        {paginatedDomains.map((domain) => {
          const stats = domainStats.get(domain.id);

          return (
            <Link
              key={domain.id}
              href={`/orgs/${orgSlug}/domains/${domain.id}`}
              className={cn(
                gridClass,
                'py-4 hover:bg-muted/50 -mx-4 px-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
              role="listitem"
            >
              {/* Domain Column */}
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{domain.domain}</p>
                  {domain.displayName && domain.displayName !== domain.domain && (
                    <p className="text-sm text-muted-foreground truncate">
                      {domain.displayName}
                    </p>
                  )}
                </div>
              </div>

              {/* DNS Records Column - hidden on mobile */}
              <div className="hidden md:block">
                <DnsStatusBadges domainId={domain.id} orgSlug={orgSlug} />
              </div>

              {/* Volume Bar Column - hidden on mobile/tablet */}
              {showVolumeBar && (
                <div className="hidden lg:flex items-center justify-center">
                  {statsLoading ? (
                    <div className="w-full max-w-[160px] h-3 bg-muted rounded-full animate-pulse" />
                  ) : stats ? (
                    <VolumeBar
                      volumePercent={stats.volumePercent || 0}
                      totalMessages={stats.totalMessages || 0}
                      passedMessages={stats.passedMessages || 0}
                      failedMessages={stats.failedMessages || 0}
                      passRate={stats.passRate || 0}
                    />
                  ) : (
                    <div className="w-full max-w-[160px] h-3 bg-muted/30 rounded-full" />
                  )}
                </div>
              )}

              {/* Status Column */}
              <div className="flex justify-end">
                {domain.verifiedAt ? (
                  <Badge variant="secondary" className="gap-1 shrink-0">
                    <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                    <span>Verified</span>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-warning shrink-0">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    <span>Pending</span>
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Empty State */}
      {filteredDomains.length === 0 && search && (
        <div className="text-center py-8 text-muted-foreground" role="status">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" aria-hidden="true" />
          <p>No domains match &quot;{search}&quot;</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="flex items-center justify-between pt-4 border-t" aria-label="Pagination">
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
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Button>
            <span className="text-sm" aria-current="page">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
