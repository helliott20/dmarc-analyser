'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface TopSource {
  organization: string;
  totalMessages: number;
  dmarcPercent: number;
  spfPercent: number;
  dkimPercent: number;
}

interface TopSourcesTableProps {
  orgSlug: string;
}

function PercentBadge({ value, className }: { value: number; className?: string }) {
  const colorClass = value >= 90
    ? 'text-success'
    : value >= 70
    ? 'text-warning'
    : 'text-destructive';

  return (
    <span className={cn('font-medium tabular-nums', colorClass, className)}>
      {value}%
    </span>
  );
}

export function TopSourcesTable({ orgSlug }: TopSourcesTableProps) {
  const [sources, setSources] = useState<TopSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/orgs/${orgSlug}/domains/stats`);
        if (res.ok) {
          const json = await res.json();
          setSources(json.topSources || []);
        }
      } catch (error) {
        console.error('Failed to fetch top sources:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [orgSlug]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Sources</CardTitle>
          <CardDescription>Sending sources by volume (7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (sources.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top Sources</CardTitle>
          <CardDescription>Sending sources by volume (7 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No source data available yet. Import DMARC reports to see sending sources.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Top Sources</CardTitle>
        <CardDescription>Sending sources by volume (7 days)</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Volume</TableHead>
              <TableHead className="text-right">DMARC</TableHead>
              <TableHead className="text-right">SPF</TableHead>
              <TableHead className="text-right">DKIM</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sources.map((source, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium max-w-[200px] truncate">
                  {source.organization}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {source.totalMessages.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <PercentBadge value={source.dmarcPercent} />
                </TableCell>
                <TableCell className="text-right">
                  <PercentBadge value={source.spfPercent} />
                </TableCell>
                <TableCell className="text-right">
                  <PercentBadge value={source.dkimPercent} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
