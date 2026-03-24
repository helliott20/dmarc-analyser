'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Shield,
  Server,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Plus,
} from 'lucide-react';
import { SourceDetailSheet } from './source-detail-sheet';
import { KnownSenderDialog } from '@/components/known-senders/known-sender-dialog';

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
  spfPass: number;
  spfFail: number;
  dkimPass: number;
  dkimFail: number;
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

type SortKey = 'passRate' | 'totalMessages' | 'lastSeen' | 'sourceType' | 'spf' | 'dkim';

interface SourcesTableProps {
  sources: SourceWithSender[];
  orgSlug: string;
  domainId: string;
  initialSort?: string;
  initialDir?: 'asc' | 'desc';
  emptyMessage: string;
  emptyDescription: string;
}

function getSourceTypeBadge(type: string) {
  switch (type) {
    case 'legitimate':
      return (
        <Badge variant="secondary" className="bg-success/15 text-success">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Legitimate
        </Badge>
      );
    case 'suspicious':
      return (
        <Badge variant="secondary" className="bg-destructive/15 text-destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Suspicious
        </Badge>
      );
    case 'forwarded':
      return (
        <Badge variant="secondary" className="bg-info/15 text-info">
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

function getPassRate(source: Source) {
  const total = Number(source.totalMessages);
  const passed = Number(source.passedMessages);
  return total > 0 ? Math.round((passed / total) * 100) : 0;
}

function needsAttention(source: Source): boolean {
  const passRate = getPassRate(source);
  return (
    (source.sourceType === 'unknown' && source.totalMessages > 10) ||
    (source.sourceType === 'legitimate' && passRate < 90)
  );
}

function SpfDkimBadge({ pass, fail, label }: { pass: number; fail: number; label: string }) {
  const total = pass + fail;
  if (total === 0) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">{label}: -</Badge>;
  }
  if (fail === 0) {
    return (
      <Badge variant="secondary" className="text-xs bg-success/15 text-success">
        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
        {label}
      </Badge>
    );
  }
  if (pass === 0) {
    return (
      <Badge variant="secondary" className="text-xs bg-destructive/15 text-destructive">
        <XCircle className="h-2.5 w-2.5 mr-0.5" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-xs bg-warning/15 text-warning">
      <AlertTriangle className="h-2.5 w-2.5 mr-0.5" />
      {label}
    </Badge>
  );
}

function SortHeader({
  children,
  sortKey,
  currentSort,
  currentDir,
  onSort,
  className,
}: {
  children: React.ReactNode;
  sortKey: SortKey;
  currentSort: SortKey | null;
  currentDir: 'asc' | 'desc';
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = currentSort === sortKey;
  return (
    <TableHead className={className}>
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors -ml-1 px-1"
        onClick={() => onSort(sortKey)}
      >
        {children}
        {isActive ? (
          currentDir === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}

export function SourcesTable({
  sources,
  orgSlug,
  domainId,
  initialSort,
  initialDir,
  emptyMessage,
  emptyDescription,
}: SourcesTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [addSenderSource, setAddSenderSource] = useState<Source | null>(null);

  const [sortKey, setSortKey] = useState<SortKey | null>(
    (initialSort as SortKey) || null
  );
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialDir || 'desc');

  const handleSort = (key: SortKey) => {
    let newDir: 'asc' | 'desc' = 'desc';
    if (sortKey === key) {
      newDir = sortDir === 'desc' ? 'asc' : 'desc';
    }
    setSortKey(key);
    setSortDir(newDir);

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    params.set('sort', key);
    params.set('dir', newDir);
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };

  const sortedSources = useMemo(() => {
    if (!sortKey) return sources;

    return [...sources].sort((a, b) => {
      let aVal: number;
      let bVal: number;

      switch (sortKey) {
        case 'passRate':
          aVal = getPassRate(a.source);
          bVal = getPassRate(b.source);
          break;
        case 'totalMessages':
          aVal = a.source.totalMessages;
          bVal = b.source.totalMessages;
          break;
        case 'lastSeen':
          aVal = a.source.lastSeen ? new Date(a.source.lastSeen).getTime() : 0;
          bVal = b.source.lastSeen ? new Date(b.source.lastSeen).getTime() : 0;
          break;
        case 'sourceType': {
          const typeOrder: Record<string, number> = { suspicious: 0, unknown: 1, forwarded: 2, legitimate: 3 };
          aVal = typeOrder[a.source.sourceType] ?? 1;
          bVal = typeOrder[b.source.sourceType] ?? 1;
          break;
        }
        case 'spf':
          aVal = a.source.spfPass + a.source.spfFail > 0 ? a.source.spfFail / (a.source.spfPass + a.source.spfFail) : -1;
          bVal = b.source.spfPass + b.source.spfFail > 0 ? b.source.spfFail / (b.source.spfPass + b.source.spfFail) : -1;
          break;
        case 'dkim':
          aVal = a.source.dkimPass + a.source.dkimFail > 0 ? a.source.dkimFail / (a.source.dkimPass + a.source.dkimFail) : -1;
          bVal = b.source.dkimPass + b.source.dkimFail > 0 ? b.source.dkimFail / (b.source.dkimPass + b.source.dkimFail) : -1;
          break;
        default:
          return 0;
      }

      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [sources, sortKey, sortDir]);

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
      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source IP</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Known Sender</TableHead>
              <TableHead>Location</TableHead>
              <SortHeader sortKey="spf" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                SPF
              </SortHeader>
              <SortHeader sortKey="dkim" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                DKIM
              </SortHeader>
              <SortHeader sortKey="totalMessages" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                Total
              </SortHeader>
              <SortHeader sortKey="passRate" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} className="text-right">
                Pass Rate
              </SortHeader>
              <SortHeader sortKey="sourceType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Status
              </SortHeader>
              <SortHeader sortKey="lastSeen" currentSort={sortKey} currentDir={sortDir} onSort={handleSort}>
                Last Seen
              </SortHeader>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSources.map(({ source, knownSender }) => {
              const rate = getPassRate(source);
              const attention = needsAttention(source);
              return (
                <TableRow
                  key={source.id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    rate < 50 && source.totalMessages > 0 ? 'bg-destructive/10' : ''
                  }`}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAddSenderSource(source);
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        <span className="text-xs">Add</span>
                      </Button>
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
                  <TableCell>
                    <SpfDkimBadge pass={source.spfPass} fail={source.spfFail} label="SPF" />
                  </TableCell>
                  <TableCell>
                    <SpfDkimBadge pass={source.dkimPass} fail={source.dkimFail} label="DKIM" />
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {Number(source.totalMessages).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            rate >= 90 ? 'bg-success' : rate >= 70 ? 'bg-warning' : 'bg-destructive'
                          }`}
                          style={{ width: `${rate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${
                        rate >= 90 ? 'text-success' : rate >= 70 ? 'text-warning' : 'text-destructive'
                      }`}>
                        {rate}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {getSourceTypeBadge(source.sourceType)}
                      {attention && (
                        <span className="relative flex h-2 w-2" title="Needs attention">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                        </span>
                      )}
                    </div>
                  </TableCell>
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
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card Layout - shown on mobile only */}
      <div className="md:hidden space-y-3">
        {sortedSources.map(({ source, knownSender }) => {
          const rate = getPassRate(source);
          const attention = needsAttention(source);
          return (
            <div
              key={source.id}
              className={`p-4 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                rate < 50 && source.totalMessages > 0 ? 'border-destructive bg-destructive/10' : ''
              }`}
              onClick={() => setSelectedSourceId(source.id)}
            >
              {/* Top row: IP + Status */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <code className="text-sm font-bold">{source.sourceIp}</code>
                  {source.hostname && (
                    <p className="text-xs text-muted-foreground truncate">
                      {source.hostname}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {getSourceTypeBadge(source.sourceType)}
                  {attention && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                    </span>
                  )}
                </div>
              </div>

              {/* Organization + Known Sender */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <p className="text-sm font-medium truncate">
                  {source.organization || 'Unknown org'}
                </p>
                {knownSender ? (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {knownSender.logoUrl && (
                      <img
                        src={knownSender.logoUrl}
                        alt={knownSender.name}
                        className="h-4 w-4 rounded object-contain"
                      />
                    )}
                    <span className="text-xs font-medium text-info">
                      {knownSender.name}
                    </span>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAddSenderSource(source);
                    }}
                  >
                    <Plus className="h-3 w-3 mr-0.5" />
                    Add sender
                  </Button>
                )}
              </div>

              {/* Pass Rate Bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">
                    {Number(source.totalMessages).toLocaleString()} messages
                  </span>
                  <span className={`text-sm font-bold ${
                    rate >= 90 ? 'text-success' : rate >= 70 ? 'text-warning' : 'text-destructive'
                  }`}>
                    {rate}% pass
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      rate >= 90 ? 'bg-success' : rate >= 70 ? 'bg-warning' : 'bg-destructive'
                    }`}
                    style={{ width: `${rate}%` }}
                  />
                </div>
              </div>

              {/* Bottom row: SPF/DKIM badges + location + last seen */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <SpfDkimBadge pass={source.spfPass} fail={source.spfFail} label="SPF" />
                  <SpfDkimBadge pass={source.dkimPass} fail={source.dkimFail} label="DKIM" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                  {source.country && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {source.country}
                    </span>
                  )}
                  {source.lastSeen && (
                    <span>{new Date(source.lastSeen).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <SourceDetailSheet
        sourceId={selectedSourceId}
        orgSlug={orgSlug}
        domainId={domainId}
        onClose={() => setSelectedSourceId(null)}
      />

      {/* Add Known Sender Dialog - pre-filled from source */}
      {addSenderSource && (
        <KnownSenderDialog
          orgSlug={orgSlug}
          open={!!addSenderSource}
          onOpenChange={(open) => {
            if (!open) setAddSenderSource(null);
          }}
          prefill={{
            name: addSenderSource.organization || addSenderSource.hostname || '',
            ipRanges: addSenderSource.sourceIp,
          }}
        />
      )}
    </>
  );
}
