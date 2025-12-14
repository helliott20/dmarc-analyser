'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Mail,
  Key,
} from 'lucide-react';
import { toast } from 'sonner';

interface DnsRecordsCardProps {
  domain: string;
  domainId: string;
  orgSlug: string;
  dmarcRecord: string | null;
  spfRecord: string | null;
}

interface ParsedTag {
  tag: string;
  value: string;
  description: string;
  status: 'good' | 'warning' | 'error' | 'info';
}

interface DkimRecord {
  selector: string;
  record: string | null;
  valid: boolean;
}

interface SpfMatch {
  type: 'include' | 'ip4' | 'ip6';
  value: string;
  sender: {
    id: string;
    name: string;
    category: string;
    logoUrl: string | null;
    website: string | null;
  } | null;
}

// Parse DMARC record
function parseDmarcRecord(record: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  const parts = record.split(';').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const [tag, ...valueParts] = part.split('=');
    const value = valueParts.join('=');

    switch (tag?.toLowerCase()) {
      case 'v':
        tags.push({
          tag: 'v',
          value,
          description: 'Version identifier for DMARC records',
          status: value === 'DMARC1' ? 'good' : 'error',
        });
        break;
      case 'p':
        {
          const policyDescriptions: Record<string, string> = {
            reject: 'Reject emails that fail authentication',
            quarantine: 'Send failing emails to spam folder',
            none: 'Monitor only, no action taken',
          };
          tags.push({
            tag: 'p',
            value,
            description: policyDescriptions[value] || 'Domain policy for failed emails',
            status:
              value === 'reject'
                ? 'good'
                : value === 'quarantine'
                ? 'warning'
                : 'error',
          });
        }
        break;
      case 'sp':
        {
          const subdomainDescriptions: Record<string, string> = {
            reject: 'Reject emails from subdomains that fail',
            quarantine: 'Send failing subdomain emails to spam',
            none: 'Monitor subdomains only, no action taken',
          };
          tags.push({
            tag: 'sp',
            value,
            description: subdomainDescriptions[value] || 'Subdomain policy for failed emails',
            status:
              value === 'reject'
                ? 'good'
                : value === 'quarantine'
                ? 'warning'
                : 'info',
          });
        }
        break;
      case 'rua':
        tags.push({
          tag: 'rua',
          value,
          description: 'Where aggregate reports are sent',
          status: 'good',
        });
        break;
      case 'ruf':
        tags.push({
          tag: 'ruf',
          value,
          description: 'Where detailed failure reports are sent',
          status: 'good',
        });
        break;
      case 'pct':
        {
          const pctValue = parseInt(value);
          const pctDescription = pctValue === 100
            ? 'Policy applies to all emails'
            : `Policy applies to ${pctValue}% of emails`;
          tags.push({
            tag: 'pct',
            value,
            description: pctDescription,
            status: pctValue === 100 ? 'good' : 'warning',
          });
        }
        break;
      case 'adkim':
        tags.push({
          tag: 'adkim',
          value,
          description: value === 's' ? 'Strict DKIM alignment required' : 'Relaxed DKIM alignment allowed',
          status: value === 's' ? 'good' : 'info',
        });
        break;
      case 'aspf':
        tags.push({
          tag: 'aspf',
          value,
          description: value === 's' ? 'Strict SPF alignment required' : 'Relaxed SPF alignment allowed',
          status: value === 's' ? 'good' : 'info',
        });
        break;
      case 'fo':
        {
          const foDescriptions: Record<string, string> = {
            '0': 'Report when all checks fail',
            '1': 'Report when any check fails',
            'd': 'Report DKIM failures only',
            's': 'Report SPF failures only',
          };
          tags.push({
            tag: 'fo',
            value,
            description: foDescriptions[value] || 'Controls when failure reports are generated',
            status: 'info',
          });
        }
        break;
      case 'ri':
        {
          const seconds = parseInt(value);
          const hours = Math.round(seconds / 3600);
          tags.push({
            tag: 'ri',
            value,
            description: hours > 0 ? `Reports sent every ${hours} hour${hours > 1 ? 's' : ''}` : 'Report interval in seconds',
            status: 'info',
          });
        }
        break;
      default:
        if (tag) {
          tags.push({
            tag,
            value,
            description: 'Unknown tag',
            status: 'info',
          });
        }
    }
  }

  return tags;
}

// Parse SPF record
function parseSpfRecord(record: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  const parts = record.split(/\s+/).filter(Boolean);

  for (const part of parts) {
    const lowerPart = part.toLowerCase();

    if (lowerPart === 'v=spf1') {
      tags.push({
        tag: 'v',
        value: 'spf1',
        description: 'Version identifier for SPF records',
        status: 'good',
      });
    } else if (lowerPart.startsWith('include:')) {
      tags.push({
        tag: 'include',
        value: part.slice(8),
        description: 'Authorise servers from this domain to send email',
        status: 'info',
      });
    } else if (lowerPart.startsWith('a:') || lowerPart === 'a') {
      tags.push({
        tag: 'a',
        value: part.slice(2) || 'self',
        description: 'Authorise IP addresses from A records',
        status: 'info',
      });
    } else if (lowerPart.startsWith('mx:') || lowerPart === 'mx') {
      tags.push({
        tag: 'mx',
        value: part.slice(3) || 'self',
        description: 'Authorise mail server IP addresses',
        status: 'info',
      });
    } else if (lowerPart.startsWith('ip4:')) {
      tags.push({
        tag: 'ip4',
        value: part.slice(4),
        description: 'Authorise this IPv4 address or range',
        status: 'info',
      });
    } else if (lowerPart.startsWith('ip6:')) {
      tags.push({
        tag: 'ip6',
        value: part.slice(4),
        description: 'Authorise this IPv6 address or range',
        status: 'info',
      });
    } else if (lowerPart.startsWith('redirect=')) {
      tags.push({
        tag: 'redirect',
        value: part.slice(9),
        description: 'Use SPF policy from another domain instead',
        status: 'warning',
      });
    } else if (lowerPart.startsWith('exists:')) {
      tags.push({
        tag: 'exists',
        value: part.slice(7),
        description: 'Advanced check if domain exists',
        status: 'info',
      });
    } else if (lowerPart === '-all') {
      tags.push({
        tag: 'all',
        value: '-all (hard fail)',
        description: 'Reject emails from unlisted servers',
        status: 'good',
      });
    } else if (lowerPart === '~all') {
      tags.push({
        tag: 'all',
        value: '~all (soft fail)',
        description: 'Mark emails from unlisted servers as suspicious',
        status: 'warning',
      });
    } else if (lowerPart === '?all') {
      tags.push({
        tag: 'all',
        value: '?all (neutral)',
        description: 'No policy for unlisted servers',
        status: 'warning',
      });
    } else if (lowerPart === '+all') {
      tags.push({
        tag: 'all',
        value: '+all (pass)',
        description: 'Allow any server to send email (not recommended)',
        status: 'error',
      });
    }
  }

  return tags;
}

// Parse DKIM record
function parseDkimRecord(record: string): ParsedTag[] {
  const tags: ParsedTag[] = [];
  const parts = record.split(';').map((p) => p.trim()).filter(Boolean);

  for (const part of parts) {
    const [tag, ...valueParts] = part.split('=');
    const value = valueParts.join('=');

    switch (tag?.toLowerCase()) {
      case 'v':
        tags.push({
          tag: 'v',
          value,
          description: 'Version identifier for DKIM records',
          status: value === 'DKIM1' ? 'good' : 'error',
        });
        break;
      case 'k':
        {
          const keyTypes: Record<string, string> = {
            rsa: 'RSA encryption (standard)',
            ed25519: 'Ed25519 encryption (modern)',
          };
          tags.push({
            tag: 'k',
            value,
            description: keyTypes[value] || 'Encryption algorithm used for signing',
            status: value === 'rsa' || value === 'ed25519' ? 'good' : 'info',
          });
        }
        break;
      case 'p':
        if (!value) {
          tags.push({
            tag: 'p',
            value: '(revoked)',
            description: 'This key has been revoked and is no longer valid',
            status: 'error',
          });
        } else {
          const truncated = value.length > 50 ? value.slice(0, 50) + '...' : value;
          tags.push({
            tag: 'p',
            value: truncated,
            description: `Public key for verifying signatures (${value.length} characters)`,
            status: 'good',
          });
        }
        break;
      case 't':
        tags.push({
          tag: 't',
          value,
          description: value.includes('y') ? 'Key is in testing mode (not enforced)' : 'Configuration flags',
          status: value.includes('y') ? 'warning' : 'info',
        });
        break;
      case 'h':
        tags.push({
          tag: 'h',
          value,
          description: 'Allowed hash algorithms for signatures',
          status: 'info',
        });
        break;
      case 's':
        {
          const serviceTypes: Record<string, string> = {
            email: 'Used for email signing only',
            '*': 'Can be used for any service',
          };
          tags.push({
            tag: 's',
            value,
            description: serviceTypes[value] || 'Restricts which services can use this key',
            status: 'info',
          });
        }
        break;
      default:
        if (tag) {
          tags.push({
            tag,
            value,
            description: 'Additional configuration',
            status: 'info',
          });
        }
    }
  }

  return tags;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'good':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-destructive" />;
    default:
      return <Shield className="h-4 w-4 text-muted-foreground" />;
  }
};

function RecordDisplay({
  record,
  parsedTags,
  emptyMessage,
  emptyIcon: EmptyIcon,
}: {
  record: string | null;
  parsedTags: ParsedTag[];
  emptyMessage: string;
  emptyIcon: React.ElementType;
}) {
  if (!record) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <EmptyIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Raw Record</p>
        <code className="block p-3 bg-muted rounded-md text-sm font-mono break-all">
          {record}
        </code>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Record Settings</p>
        <div className="grid gap-2 md:grid-cols-2">
          {parsedTags.map((tag, index) => (
            <div
              key={`${tag.tag}-${index}`}
              className="flex items-start gap-2 p-2 rounded-md bg-muted/50 overflow-hidden"
            >
              <div className="shrink-0 mt-0.5">
                {getStatusIcon(tag.status)}
              </div>
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono font-medium">
                    {tag.tag}=
                  </code>
                </div>
                <p className="text-xs font-mono text-muted-foreground break-all">
                  {tag.value}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {tag.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DnsRecordsCard({
  domain,
  domainId,
  orgSlug,
  dmarcRecord,
  spfRecord,
}: DnsRecordsCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dmarc, setDmarc] = useState(dmarcRecord);
  const [spf, setSpf] = useState(spfRecord);
  const [dkimRecords, setDkimRecords] = useState<DkimRecord[]>([]);
  const [isLoadingDkim, setIsLoadingDkim] = useState(true);
  const [spfMatches, setSpfMatches] = useState<SpfMatch[]>([]);

  const dmarcTags = dmarc ? parseDmarcRecord(dmarc) : [];
  const spfTags = spf ? parseSpfRecord(spf) : [];

  const fetchSpfMatches = useCallback(async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/domains/${domainId}/spf-matches`);
      if (response.ok) {
        const data = await response.json();
        setSpfMatches(data.matches || []);
      }
    } catch {
      console.error('Failed to fetch SPF matches');
    }
  }, [orgSlug, domainId]);

  const fetchDkimRecords = useCallback(async () => {
    setIsLoadingDkim(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/domains/${domainId}/dkim`);
      if (response.ok) {
        const data = await response.json();
        setDkimRecords(data.selectors || []);
      }
    } catch {
      console.error('Failed to fetch DKIM records');
    } finally {
      setIsLoadingDkim(false);
    }
  }, [orgSlug, domainId]);

  // Load DKIM records and SPF matches on mount
  useEffect(() => {
    fetchDkimRecords();
    fetchSpfMatches();
  }, [fetchDkimRecords, fetchSpfMatches]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${type} record copied to clipboard`);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const refreshAllRecords = async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/domains/${domainId}/dns-refresh`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.dmarc?.record !== undefined) {
        setDmarc(data.dmarc.record);
      }
      if (data.spf?.record !== undefined) {
        setSpf(data.spf.record);
      }

      // Also refresh DKIM and SPF matches
      await Promise.all([fetchDkimRecords(), fetchSpfMatches()]);

      const changes = [];
      if (data.dmarc?.changed) changes.push('DMARC');
      if (data.spf?.changed) changes.push('SPF');

      if (changes.length > 0) {
        toast.success(`DNS records updated - ${changes.join(', ')} changed`);
      } else {
        toast.success('DNS records refreshed');
      }
    } catch {
      toast.error('Failed to refresh DNS records');
    } finally {
      setIsRefreshing(false);
    }
  };

  const validDkimRecords = dkimRecords.filter((r) => r.valid);

  // Determine overall status for each record type
  const dmarcStatus = dmarc ? 'found' : 'missing';
  const spfStatus = spf ? 'found' : 'missing';
  const dkimStatus = validDkimRecords.length > 0 ? 'found' : 'missing';

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Email Authentication Records
          </CardTitle>
          <CardDescription>
            DNS records that protect {domain} from email spoofing and phishing
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={refreshAllRecords}
          disabled={isRefreshing}
          aria-label="Refresh all DNS records"
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dmarc" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dmarc" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">DMARC</span>
              <span className={`h-2 w-2 rounded-full ${dmarcStatus === 'found' ? 'bg-success' : 'bg-destructive'}`} />
            </TabsTrigger>
            <TabsTrigger value="spf" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">SPF</span>
              <span className={`h-2 w-2 rounded-full ${spfStatus === 'found' ? 'bg-success' : 'bg-destructive'}`} />
            </TabsTrigger>
            <TabsTrigger value="dkim" className="gap-2">
              <Key className="h-4 w-4" />
              <span className="hidden sm:inline">DKIM</span>
              <span className={`h-2 w-2 rounded-full ${isLoadingDkim ? 'bg-muted-foreground' : dkimStatus === 'found' ? 'bg-success' : 'bg-warning'}`} />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dmarc" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-muted-foreground">
                Controls how receiving servers handle emails that fail authentication checks
              </p>
              {dmarc && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(dmarc, 'DMARC')}
                  aria-label="Copy DMARC record"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <RecordDisplay
              record={dmarc}
              parsedTags={dmarcTags}
              emptyMessage={`No DMARC record found. Add a TXT record at _dmarc.${domain} to specify how to handle unauthenticated emails.`}
              emptyIcon={Shield}
            />
          </TabsContent>

          <TabsContent value="spf" className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <p className="text-sm text-muted-foreground">
                Lists which servers are authorised to send email on behalf of your domain
              </p>
              {spf && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(spf, 'SPF')}
                  aria-label="Copy SPF record"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              )}
            </div>
            <RecordDisplay
              record={spf}
              parsedTags={spfTags}
              emptyMessage={`No SPF record found. Add a TXT record at ${domain} starting with "v=spf1" to specify which servers can send email for your domain.`}
              emptyIcon={Mail}
            />

            {spfMatches.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <h4 className="text-sm font-medium mb-3">Authorised Email Services</h4>
                <div className="space-y-2">
                  {spfMatches.map((match, index) => (
                    <div
                      key={`${match.type}-${match.value}-${index}`}
                      className="flex items-center gap-3 p-2 rounded-md bg-muted/50"
                    >
                      {match.sender ? (
                        <>
                          {match.sender.logoUrl ? (
                            <img
                              src={match.sender.logoUrl}
                              alt={match.sender.name}
                              className="h-6 w-6 rounded object-contain"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center">
                              <CheckCircle2 className="h-4 w-4 text-success" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{match.sender.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {match.type === 'include' ? 'include:' : match.type === 'ip4' ? 'ip4:' : 'ip6:'}{match.value}
                            </p>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success capitalize">
                            {match.sender.category}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="h-6 w-6 rounded bg-muted flex items-center justify-center">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-muted-foreground">
                              {match.type === 'ip6' ? 'IPv6 address' : 'Unknown sender'}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {match.type === 'include' ? 'include:' : match.type === 'ip4' ? 'ip4:' : 'ip6:'}{match.value}
                            </p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="dkim" className="mt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Cryptographic keys used to verify that emails were genuinely sent from your domain
            </p>

            {isLoadingDkim ? (
              <div className="text-center py-6">
                <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground mt-2">Looking for DKIM keys...</p>
              </div>
            ) : validDkimRecords.length > 0 ? (
              <div className="space-y-4">
                {validDkimRecords.map((dkimRecord) => (
                  <div key={dkimRecord.selector} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        <span className="font-medium text-sm">
                          Key: <code>{dkimRecord.selector}</code>
                        </span>
                      </div>
                      {dkimRecord.record && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(dkimRecord.record!, `DKIM (${dkimRecord.selector})`)}
                          aria-label={`Copy DKIM record for ${dkimRecord.selector}`}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Published at <code>{dkimRecord.selector}._domainkey.{domain}</code>
                    </p>
                    {dkimRecord.record && (
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Raw Record</p>
                          <code className="block p-2 bg-muted rounded-md text-xs font-mono break-all">
                            {dkimRecord.record}
                          </code>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Settings</p>
                          <div className="grid gap-2 md:grid-cols-2">
                            {parseDkimRecord(dkimRecord.record).map((tag, index) => (
                              <div
                                key={`${tag.tag}-${index}`}
                                className="flex items-start gap-2 p-2 rounded-md bg-muted/50 overflow-hidden"
                              >
                                <div className="shrink-0 mt-0.5">
                                  {getStatusIcon(tag.status)}
                                </div>
                                <div className="flex-1 min-w-0 overflow-hidden">
                                  <code className="text-xs font-mono font-medium">
                                    {tag.tag}=
                                  </code>
                                  <p className="text-xs font-mono text-muted-foreground break-all">
                                    {tag.value}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {tag.description}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No DKIM keys found</p>
                <p className="text-xs mt-2 max-w-md mx-auto">
                  We checked common key names (google, default, selector1, selector2, k1, dkim, mail) but did not find any published keys.
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
