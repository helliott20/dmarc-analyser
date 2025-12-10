'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  CheckCircle2,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface Domain {
  id: string;
  domain: string;
  displayName: string | null;
  verifiedAt: Date | null;
}

interface DomainsListProps {
  domains: Domain[];
  orgSlug: string;
}

const PAGE_SIZE = 20;

export function DomainsList({ domains, orgSlug }: DomainsListProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
        {paginatedDomains.map((domain) => (
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
            <div className="flex items-center gap-2">
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
        ))}
      </div>

      {/* Empty State */}
      {filteredDomains.length === 0 && search && (
        <div className="text-center py-8 text-muted-foreground">
          <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>No domains match "{search}"</p>
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
