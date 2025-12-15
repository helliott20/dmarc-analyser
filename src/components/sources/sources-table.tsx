'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Shield,
  Server,
} from 'lucide-react';
import { SourceDetailSheet } from './source-detail-sheet';

interface Source {
  id: string;
  sourceIp: string;
  hostname: string | null;
  organization: string | null;
  country: string | null;
  city: string | null;
  asn: string | null;
  sourceType: string;
  totalMessages: number;
  passedMessages: number;
  failedMessages: number;
  lastSeen: string | null;
}

interface KnownSender {
  id: string;
  name: string;
  logoUrl: string | null;
  isGlobal: boolean;
}

interface SourceWithSender {
  source: Source;
  knownSender: KnownSender | null;
}

interface SourcesTableProps {
  sources: SourceWithSender[];
  orgSlug: string;
  domainId: string;
  emptyMessage: string;
  emptyDescription: string;
}

function getSourceTypeBadge(type: string) {
  switch (type) {
    case 'legitimate':
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Legitimate
        </Badge>
      );
    case 'suspicious':
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          Suspicious
        </Badge>
      );
    case 'forwarded':
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Forwarded
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Unknown
        </Badge>
      );
  }
}

export function SourcesTable({
  sources,
  orgSlug,
  domainId,
  emptyMessage,
  emptyDescription,
}: SourcesTableProps) {
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);

  if (sources.length === 0) {
    return (
      <div className="text-center py-12">
        <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
        <p className="text-muted-foreground">{emptyDescription}</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Source IP</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead>Known Sender</TableHead>
            <TableHead>Location</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Passed</TableHead>
            <TableHead className="text-right">Failed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last Seen</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map(({ source, knownSender }) => (
            <TableRow
              key={source.id}
              className="cursor-pointer hover:bg-muted/50"
              onClick={() => setSelectedSourceId(source.id)}
            >
              <TableCell>
                <div>
                  <code className="text-sm font-medium">{source.sourceIp}</code>
                  {source.hostname && (
                    <p className="text-xs text-muted-foreground">
                      {source.hostname}
                    </p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">
                    {source.organization || 'Unknown'}
                  </p>
                  {source.asn && (
                    <p className="text-xs text-muted-foreground">{source.asn}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {knownSender ? (
                  <div className="flex items-center gap-2">
                    {knownSender.logoUrl && (
                      <img
                        src={knownSender.logoUrl}
                        alt={knownSender.name}
                        className="h-4 w-4 rounded object-contain"
                      />
                    )}
                    <div>
                      <p className="font-medium text-sm">{knownSender.name}</p>
                      {knownSender.isGlobal && (
                        <Badge
                          variant="secondary"
                          className="text-xs h-4 px-1"
                        >
                          <Shield className="h-2 w-2 mr-1" />
                          Global
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <span className="text-muted-foreground text-sm">-</span>
                )}
              </TableCell>
              <TableCell>
                {source.country ? (
                  <div className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span>
                      {source.city && `${source.city}, `}
                      {source.country}
                    </span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unknown</span>
                )}
              </TableCell>
              <TableCell className="text-right font-medium">
                {Number(source.totalMessages).toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-green-600">
                {Number(source.passedMessages).toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-red-600">
                {Number(source.failedMessages).toLocaleString()}
              </TableCell>
              <TableCell>{getSourceTypeBadge(source.sourceType)}</TableCell>
              <TableCell>
                {source.lastSeen ? (
                  <span className="text-sm text-muted-foreground">
                    {new Date(source.lastSeen).toLocaleDateString()}
                  </span>
                ) : (
                  '-'
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <SourceDetailSheet
        sourceId={selectedSourceId}
        orgSlug={orgSlug}
        domainId={domainId}
        onClose={() => setSelectedSourceId(null)}
      />
    </>
  );
}
