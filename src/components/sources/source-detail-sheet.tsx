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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  ShieldAlert,
  ShieldCheck,
  Key,
  Mail,
  Lightbulb,
  Ban,
  AlertOctagon,
  Plus,
} from 'lucide-react';
import { KnownSenderDialog } from '@/components/known-senders/known-sender-dialog';

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

interface FailureAnalysis {
  dkim: {
    total: number;
    passed: number;
    failed: number;
    failuresByDomain: Record<string, { count: number; results: string[]; selectors: string[] }>;
  };
  spf: {
    total: number;
    passed: number;
    failed: number;
    failuresByDomain: Record<string, { count: number; results: string[] }>;
  };
  dispositions: Record<string, number>;
  overrideReasons: unknown[];
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

function getResultLabel(result: string) {
  switch (result) {
    case 'pass': return 'Pass';
    case 'fail': return 'Fail';
    case 'softfail': return 'Soft Fail';
    case 'neutral': return 'Neutral';
    case 'temperror': return 'Temp Error';
    case 'permerror': return 'Perm Error';
    case 'none': return 'None';
    case 'policy': return 'Policy';
    default: return result;
  }
}

function getRemediationSteps(
  source: SourceDetail,
  failureAnalysis: FailureAnalysis,
  knownSender: KnownSender | null
): { title: string; description: string; severity: 'critical' | 'warning' | 'info' }[] {
  const steps: { title: string; description: string; severity: 'critical' | 'warning' | 'info' }[] = [];

  const hasDkimFailures = failureAnalysis.dkim.failed > 0;
  const hasSpfFailures = failureAnalysis.spf.failed > 0;
  const totalMessages = source.totalMessages;
  const passRate = totalMessages > 0 ? (source.passedMessages / totalMessages) * 100 : 0;

  // Check if this is a known/legitimate sender with failures
  if ((source.sourceType === 'legitimate' || knownSender) && passRate < 100) {
    if (hasDkimFailures && hasSpfFailures) {
      steps.push({
        title: 'Legitimate sender failing both DKIM and SPF',
        description: `This is a recognised sender but authentication is failing. Check that your DNS records include this sender's SPF include directive and that DKIM signing is correctly configured for their sending domain.`,
        severity: 'critical',
      });
    } else if (hasDkimFailures) {
      steps.push({
        title: 'DKIM signature verification failing',
        description: `DKIM signatures from this sender are not verifying. This usually means the DKIM public key in DNS doesn't match the private key used to sign, or the message was modified in transit. Contact this sender to verify their DKIM configuration.`,
        severity: 'warning',
      });
    } else if (hasSpfFailures) {
      steps.push({
        title: 'SPF check failing for known sender',
        description: `This sender's IP is not authorised in your SPF record. Add their IP range or include mechanism to your SPF record (e.g. include:_spf.provider.com).`,
        severity: 'warning',
      });
    }
  }

  // Unknown source with high volume
  if (source.sourceType === 'unknown' && totalMessages > 10) {
    steps.push({
      title: 'Classify this high-volume source',
      description: `This unclassified source has sent ${totalMessages.toLocaleString()} messages. Review the sender details and reports below to determine if it's legitimate, a forwarder, or suspicious. Use the classification buttons above.`,
      severity: 'warning',
    });
  }

  // Suspicious source still sending
  if (source.sourceType === 'suspicious' && totalMessages > 0) {
    steps.push({
      title: 'Suspicious source detected',
      description: `This source has been marked as suspicious. If your DMARC policy is set to "none", these messages are still being delivered. Consider moving to a "quarantine" or "reject" policy to block unauthorised senders.`,
      severity: 'critical',
    });
  }

  // SPF-specific guidance
  const spfDomains = Object.entries(failureAnalysis.spf.failuresByDomain);
  for (const [domain, info] of spfDomains) {
    if (info.results.includes('permerror')) {
      steps.push({
        title: `SPF permanent error for ${domain}`,
        description: 'Your SPF record has a syntax error or exceeds the 10 DNS lookup limit. Use an SPF flattening tool or reduce the number of include mechanisms.',
        severity: 'critical',
      });
    }
    if (info.results.includes('temperror')) {
      steps.push({
        title: `SPF temporary error for ${domain}`,
        description: 'DNS lookups for SPF are timing out. This is usually a transient DNS issue but if it persists, check your DNS provider reliability.',
        severity: 'info',
      });
    }
    if (info.results.includes('softfail') && !info.results.includes('fail')) {
      steps.push({
        title: `SPF soft fail for ${domain}`,
        description: `The sender's IP is not in the SPF record but your policy uses ~all (soft fail). If this is a legitimate sender, add their IP to SPF. If not, consider using -all (hard fail) to strengthen your policy.`,
        severity: 'info',
      });
    }
  }

  // DKIM-specific guidance
  const dkimDomains = Object.entries(failureAnalysis.dkim.failuresByDomain);
  for (const [domain, info] of dkimDomains) {
    if (info.results.includes('permerror')) {
      steps.push({
        title: `DKIM permanent error for ${domain}`,
        description: `The DKIM public key record for ${domain} could not be parsed. Check that the DKIM DNS record${info.selectors.length > 0 ? ` (selector: ${info.selectors.join(', ')})` : ''} is correctly formatted.`,
        severity: 'critical',
      });
    }
    if (info.results.includes('none') && failureAnalysis.dkim.total > 0) {
      steps.push({
        title: `No DKIM signature from ${domain}`,
        description: `Messages from this source are not being DKIM-signed for ${domain}. If this is your sending service, enable DKIM signing in their configuration panel.`,
        severity: 'warning',
      });
    }
  }

  // Disposition warnings
  if (failureAnalysis.dispositions['quarantine'] > 0) {
    steps.push({
      title: `${failureAnalysis.dispositions['quarantine'].toLocaleString()} messages quarantined`,
      description: 'These messages were sent to spam/junk folders by receiving mail servers due to DMARC policy. If from a legitimate sender, fix the authentication issues above.',
      severity: 'warning',
    });
  }
  if (failureAnalysis.dispositions['reject'] > 0) {
    steps.push({
      title: `${failureAnalysis.dispositions['reject'].toLocaleString()} messages rejected`,
      description: 'These messages were outright rejected by receiving mail servers. If from a legitimate sender, this is urgent — fix authentication immediately.',
      severity: 'critical',
    });
  }

  // Forwarding detection
  if (source.sourceType === 'forwarded' && passRate < 80) {
    steps.push({
      title: 'Forwarding breaking authentication',
      description: 'Email forwarding typically breaks SPF (since the forwarding server IP differs). This is expected. Consider using ARC (Authenticated Received Chain) headers if your provider supports it, and ensure DKIM alignment passes.',
      severity: 'info',
    });
  }

  // Override reasons
  if (failureAnalysis.overrideReasons.length > 0) {
    steps.push({
      title: 'Policy overrides detected',
      description: 'Some receiving servers overrode your DMARC policy for these messages (e.g. due to mailing list detection or local policy). This is normal for forwarded mail.',
      severity: 'info',
    });
  }

  return steps;
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
  const [failureAnalysis, setFailureAnalysis] = useState<FailureAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'failures' | 'reports'>('overview');
  const [showAddSender, setShowAddSender] = useState(false);

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
      setFailureAnalysis(null);
      setActiveTab('overview');
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
          setFailureAnalysis(data.failureAnalysis || null);
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

  const hasFailures = source && source.failedMessages > 0;

  return (
    <Sheet open={!!sourceId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Source Details
          </SheetTitle>
          <SheetDescription>
            View details, failure analysis, and reports for this source
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

                {/* Add as Known Sender - shown when no sender is matched */}
                {!knownSender && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAddSender(true)}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Add as Known Sender
                  </Button>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
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
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 p-1 rounded-lg bg-muted">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'overview'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Overview
                </button>
                <button
                  onClick={() => setActiveTab('failures')}
                  className={`flex-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors relative ${
                    activeTab === 'failures'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Failures
                  {hasFailures && (
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`flex-1 px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-colors ${
                    activeTab === 'reports'
                      ? 'bg-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Reports ({reports.length})
                </button>
              </div>

              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
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

                  {/* Quick failure summary on overview */}
                  {failureAnalysis && hasFailures && (
                    <>
                      <Separator />
                      <div
                        className="p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                        onClick={() => setActiveTab('failures')}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <ShieldAlert className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800 dark:text-red-200 text-sm">
                            Authentication failures detected
                          </span>
                        </div>
                        <div className="flex gap-4 text-xs">
                          {failureAnalysis.dkim.failed > 0 && (
                            <span className="text-red-700 dark:text-red-300">
                              DKIM: {failureAnalysis.dkim.failed} failed
                            </span>
                          )}
                          {failureAnalysis.spf.failed > 0 && (
                            <span className="text-red-700 dark:text-red-300">
                              SPF: {failureAnalysis.spf.failed} failed
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          Tap to view failure details and remediation steps →
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Failures Tab */}
              {activeTab === 'failures' && failureAnalysis && (
                <div className="space-y-4">
                  {/* Remediation Steps */}
                  {(() => {
                    const steps = getRemediationSteps(source, failureAnalysis, knownSender);
                    if (steps.length === 0 && !hasFailures) {
                      return (
                        <div className="text-center py-8">
                          <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
                          <p className="font-medium text-green-700 dark:text-green-400">
                            All clear
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            No authentication failures detected for this source.
                          </p>
                        </div>
                      );
                    }
                    return (
                      <>
                        {steps.length > 0 && (
                          <div className="space-y-3">
                            <h3 className="font-semibold flex items-center gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-yellow-500" />
                              Recommended Actions
                            </h3>
                            {steps.map((step, i) => (
                              <Card
                                key={i}
                                className={`border-l-4 ${
                                  step.severity === 'critical'
                                    ? 'border-l-red-500'
                                    : step.severity === 'warning'
                                    ? 'border-l-yellow-500'
                                    : 'border-l-blue-500'
                                }`}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start gap-2">
                                    {step.severity === 'critical' ? (
                                      <AlertOctagon className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                    ) : step.severity === 'warning' ? (
                                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                    ) : (
                                      <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                      <p className="font-medium text-sm">{step.title}</p>
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {step.description}
                                      </p>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <Separator />

                  {/* DKIM Analysis */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <Key className="h-4 w-4" />
                      DKIM Results
                    </h3>
                    {failureAnalysis.dkim.total === 0 ? (
                      <p className="text-sm text-muted-foreground">No DKIM records found.</p>
                    ) : (
                      <>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span>{failureAnalysis.dkim.passed} passed</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span>{failureAnalysis.dkim.failed} failed</span>
                          </div>
                        </div>
                        {Object.entries(failureAnalysis.dkim.failuresByDomain).length > 0 && (
                          <div className="space-y-2">
                            {Object.entries(failureAnalysis.dkim.failuresByDomain).map(([domain, info]) => (
                              <div key={domain} className="p-2 rounded border bg-red-50 dark:bg-red-900/10">
                                <div className="flex items-center justify-between">
                                  <code className="text-xs font-medium">{domain}</code>
                                  <Badge variant="destructive" className="text-xs h-5">
                                    {info.count}x
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {info.results.map(r => (
                                    <Badge key={r} variant="outline" className="text-xs border-red-300">
                                      {getResultLabel(r)}
                                    </Badge>
                                  ))}
                                </div>
                                {info.selectors.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Selectors: {info.selectors.join(', ')}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* SPF Analysis */}
                  <div className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4" />
                      SPF Results
                    </h3>
                    {failureAnalysis.spf.total === 0 ? (
                      <p className="text-sm text-muted-foreground">No SPF records found.</p>
                    ) : (
                      <>
                        <div className="flex gap-4 text-sm">
                          <div className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span>{failureAnalysis.spf.passed} passed</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <XCircle className="h-3 w-3 text-red-500" />
                            <span>{failureAnalysis.spf.failed} failed</span>
                          </div>
                        </div>
                        {Object.entries(failureAnalysis.spf.failuresByDomain).length > 0 && (
                          <div className="space-y-2">
                            {Object.entries(failureAnalysis.spf.failuresByDomain).map(([domain, info]) => (
                              <div key={domain} className="p-2 rounded border bg-red-50 dark:bg-red-900/10">
                                <div className="flex items-center justify-between">
                                  <code className="text-xs font-medium">{domain}</code>
                                  <Badge variant="destructive" className="text-xs h-5">
                                    {info.count}x
                                  </Badge>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {info.results.map(r => (
                                    <Badge key={r} variant="outline" className="text-xs border-red-300">
                                      {getResultLabel(r)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Dispositions */}
                  {Object.keys(failureAnalysis.dispositions).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold flex items-center gap-2 text-sm">
                        <Ban className="h-4 w-4" />
                        Message Dispositions
                      </h3>
                      <div className="grid grid-cols-3 gap-2">
                        {failureAnalysis.dispositions['none'] !== undefined && (
                          <div className="text-center p-2 rounded bg-muted/50">
                            <p className="text-lg font-bold">{failureAnalysis.dispositions['none'].toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Delivered</p>
                          </div>
                        )}
                        {failureAnalysis.dispositions['quarantine'] !== undefined && (
                          <div className="text-center p-2 rounded bg-yellow-50 dark:bg-yellow-900/20">
                            <p className="text-lg font-bold text-yellow-600">{failureAnalysis.dispositions['quarantine'].toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Quarantined</p>
                          </div>
                        )}
                        {failureAnalysis.dispositions['reject'] !== undefined && (
                          <div className="text-center p-2 rounded bg-red-50 dark:bg-red-900/20">
                            <p className="text-lg font-bold text-red-600">{failureAnalysis.dispositions['reject'].toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground">Rejected</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Failures tab - no data */}
              {activeTab === 'failures' && !failureAnalysis && (
                <div className="text-center py-8">
                  <ShieldCheck className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="font-medium">No failure data available</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Failure analysis data will appear once reports are processed.
                  </p>
                </div>
              )}

              {/* Reports Tab */}
              {activeTab === 'reports' && (
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
              )}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            Source not found
          </div>
        )}
      </SheetContent>

      {/* Add Known Sender Dialog */}
      {source && showAddSender && (
        <KnownSenderDialog
          orgSlug={orgSlug}
          open={showAddSender}
          onOpenChange={(open) => {
            setShowAddSender(open);
            if (!open && sourceId) {
              // Refresh source data after adding sender
              const fetchSourceDetails = async () => {
                try {
                  const response = await fetch(
                    `/api/orgs/${orgSlug}/domains/${domainId}/sources/${sourceId}/reports`
                  );
                  if (response.ok) {
                    const data = await response.json();
                    setSource(data.source);
                    setKnownSender(data.knownSender);
                  }
                } catch {
                  // Silently handle
                }
              };
              fetchSourceDetails();
              router.refresh();
            }
          }}
          prefill={{
            name: source.organization || source.hostname || '',
            ipRanges: source.sourceIp,
          }}
        />
      )}
    </Sheet>
  );
}
