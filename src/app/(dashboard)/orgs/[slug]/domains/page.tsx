'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Globe, Plus } from 'lucide-react';
import { CsvImportDialog } from '@/components/domains/csv-import-dialog';
import { DomainsList } from '@/components/domains/domains-list';
import { Skeleton } from '@/components/ui/skeleton';

interface Domain {
  id: string;
  domain: string;
  displayName: string | null;
  verifiedAt: Date | null;
}

export default function DomainsPage() {
  const params = useParams();
  const orgSlug = params.slug as string;
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDomains() {
      try {
        const response = await fetch(`/api/orgs/${orgSlug}/domains`);
        if (response.ok) {
          const data = await response.json();
          // The API returns an array directly, not wrapped in an object
          setDomains(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Failed to fetch domains:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDomains();
  }, [orgSlug]);

  const verifiedCount = domains.filter((d) => d.verifiedAt).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Domains</h1>
          <p className="text-muted-foreground">
            Manage domains monitored for DMARC reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvImportDialog orgSlug={orgSlug} />
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/domains/new`}>
              <Plus className="h-4 w-4 mr-2" />
              Add Domain
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{domains.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Verified</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {domains.length - verifiedCount}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domains List */}
      <Card>
        <CardHeader>
          <CardTitle>All Domains</CardTitle>
          <CardDescription>
            Click on a domain to view detailed DMARC reports and analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No domains yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first domain to start monitoring DMARC reports.
              </p>
              <div className="flex items-center justify-center gap-2">
                <CsvImportDialog orgSlug={orgSlug} />
                <Button asChild>
                  <Link href={`/orgs/${orgSlug}/domains/new`}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Domain
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <DomainsList domains={domains} orgSlug={orgSlug} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
