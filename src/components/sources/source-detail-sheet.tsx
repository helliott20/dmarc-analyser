'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MapPin,
  Server,
  Clock,
  ExternalLink,
  Loader2,
  FileText,
  Forward,
  HelpCircle,
} from 'lucide-react';

interface SourceReport {
  id: string;
  reportId: string;
  orgName: string;
  email: string | null;
  dateRangeBegin: string;
  dateRangeEnd: string;
  policyDomain: string;
  recordCount: number;
  totalMessages: number;
  passedMessages: number;
  failedMessages: number;
  passRate: number;
}

interface SourceDetail {
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
  firstSeen: string | null;
  lastSeen: string | null;
}

interface KnownSender {
  id: string;
  name: string;
  logoUrl: string | null;
  category: string;
  website: string | null;
  isGlobal: boolean;
}

interface SourceDetailSheetProps {
  sourceId: string | null;
  orgSlug: string;
  domainId: string;
  onClose: () => void;
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

export function SourceDetailSheet({
  sourceId,
  orgSlug,
  domainId,
  onClose,
}: SourceDetailSheetProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [source, setSource] = useState<SourceDetail | null>(null);
  const [knownSender, setKnownSender] = useState<KnownSender | null>(null);
  const [reports, setReports] = useState<SourceReport[]>([]);

  const handleClassify = async (newType: string) => {
    if (!sourceId || !source) return;

    setClassifying(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/domains/${domainId}/sources/${sourceId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType: newType }),
        }
      );

      if (response.ok) {
        setSource({ ...source, sourceType: newType });
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to classify source:', error);
    } finally {
      setClassifying(false);
    }
  };

  useEffect(() => {
    if (!sourceId) {
      setSource(null);
      setKnownSender(null);
      setReports([]);
      return;
    }

    const fetchSourceDetails = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/orgs/${orgSlug}/domains/${domainId}/sources/${sourceId}/reports`
        );
        if (response.ok) {
          const data = await response.json();
          setSource(data.source);
          setKnownSender(data.knownSender);
          setReports(data.reports);
        }
      } catch (error) {
        console.error('Failed to fetch source details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSourceDetails();
  }, [sourceId, orgSlug, domainId]);

  const passRate =
    source && source.totalMessages > 0
      ? Math.round((source.passedMessages / source.totalMessages) * 100)
      : 0;

  return (
    <Sheet open={!!sourceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Source Details
          </SheetTitle>
          <SheetDescription>
            View details and reports for this email source
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : source ? (
          <ScrollArea className="h-[calc(100vh-120px)] px-4">
            <div className="space-y-6 pb-6">
              {/* Source Summary */}
              <div className="space-y-4">
                <div>
                  <code className="text-lg font-bold">{source.sourceIp}</code>
                  {source.hostname && (
                    <p className="text-sm text-muted-foreground">
                      {source.hostname}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {getSourceTypeBadge(source.sourceType)}
                </div>

                {/* Known Sender */}
                {knownSender && (
                  <div className="p-3 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-3">
                      {knownSender.logoUrl && (
                        <img
                          src={knownSender.logoUrl}
                          alt={knownSender.name}
                          className="h-8 w-8 rounded object-contain"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-blue-900 dark:text-blue-100">
                          {knownSender.name}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            {knownSender.category}
                          </Badge>
                          {knownSender.isGlobal && (
                            <Badge variant="outline" className="text-xs">
                              Global
                            </Badge>
                          )}
                        </div>
                      </div>
                      {knownSender.website && (
                        <a
                          href={knownSender.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                {/* Classification Controls */}
                <div className="p-3 rounded-lg border bg-muted/30">
                  <p className="text-sm font-medium mb-3">Classify this source</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      variant={source.sourceType === 'legitimate' ? 'default' : 'outline'}
                      className={source.sourceType === 'legitimate' ? 'bg-green-600 hover:bg-green-700' : ''}
                      onClick={() => handleClassify('legitimate')}
                      disabled={classifying}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Legitimate
                    </Button>
                    <Button
                      size="sm"
                      variant={source.sourceType === 'suspicious' ? 'default' : 'outline'}
                      className={source.sourceType === 'suspicious' ? 'bg-red-600 hover:bg-red-700' : ''}
                      onClick={() => handleClassify('suspicious')}
                      disabled={classifying}
                    >
                      <XCircle className="h-3 w-3 mr-1" />
                      Suspicious
                    </Button>
                    <Button
                      size="sm"
                      variant={source.sourceType === 'forwarded' ? 'default' : 'outline'}
                      className={source.sourceType === 'forwarded' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      onClick={() => handleClassify('forwarded')}
                      disabled={classifying}
                    >
                      <Forward className="h-3 w-3 mr-1" />
                      Forwarded
                    </Button>
                    <Button
                      size="sm"
                      variant={source.sourceType === 'unknown' ? 'default' : 'outline'}
                      onClick={() => handleClassify('unknown')}
                      disabled={classifying}
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      Unknown
                    </Button>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">
                      {source.totalMessages.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">
                      {source.passedMessages.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-900/20">
                    <p className="text-2xl font-bold text-red-600">
                      {source.failedMessages.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                </div>

                {/* Pass Rate */}
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Pass Rate
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        passRate >= 90
                          ? 'text-green-600'
                          : passRate >= 70
                          ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}
                    >
                      {passRate}%
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passRate >= 90
                          ? 'bg-green-500'
                          : passRate >= 70
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${passRate}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {source.organization && (
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span>{source.organization}</span>
                      {source.asn && (
                        <span className="text-muted-foreground">
                          ({source.asn})
                        </span>
                      )}
                    </div>
                  )}
                  {source.country && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {source.city && `${source.city}, `}
                        {source.country}
                      </span>
                    </div>
                  )}
                  {source.firstSeen && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        First seen:{' '}
                        {new Date(source.firstSeen).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {source.lastSeen && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Last seen:{' '}
                        {new Date(source.lastSeen).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Reports Section */}
              <div>
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Reports containing this source ({reports.length})
                </h3>

                {reports.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reports found for this source.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {reports.map((report) => (
                      <Link
                        key={report.id}
                        href={`/orgs/${orgSlug}/domains/${domainId}/reports/${report.id}`}
                        className="block"
                      >
                        <div className="p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">
                                {report.orgName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  report.dateRangeBegin
                                ).toLocaleDateString()}{' '}
                                -{' '}
                                {new Date(
                                  report.dateRangeEnd
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                          </div>

                          <div className="flex items-center gap-4 text-xs">
                            <span className="text-muted-foreground">
                              {report.totalMessages.toLocaleString()} msgs
                            </span>
                            <span className="text-green-600">
                              {report.passedMessages.toLocaleString()} passed
                            </span>
                            <span className="text-red-600">
                              {report.failedMessages.toLocaleString()} failed
                            </span>
                            <span
                              className={`font-medium ${
                                report.passRate >= 90
                                  ? 'text-green-600'
                                  : report.passRate >= 70
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {report.passRate}%
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Source not found
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
