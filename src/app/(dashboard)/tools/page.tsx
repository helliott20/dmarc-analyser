'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  Mail,
  Key,
  Search,
  AlertCircle,
  CheckCircle2,
  Info,
  AlertTriangle,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import {
  parseDMARCRecord,
  parseSPFRecord,
  parseDKIMRecord,
  validateDMARCRecord,
  validateSPFRecord,
  validateDKIMRecord,
  getRecommendations,
  type ValidationIssue,
} from '@/lib/dns-validation';
import { toast } from 'sonner';

interface LookupResult {
  domain: string;
  record: string | null;
  allRecords: string[];
  found: boolean;
  error?: string;
}

export default function DNSToolsPage() {
  const [activeTab, setActiveTab] = useState('dmarc');
  const [domain, setDomain] = useState('');
  const [selector, setSelector] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLookup = async (type: 'dmarc' | 'spf' | 'dkim') => {
    if (!domain) {
      toast.error('Please enter a domain');
      return;
    }

    if (type === 'dkim' && !selector) {
      toast.error('Please enter a DKIM selector');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const params = new URLSearchParams({
        domain,
        type,
      });

      if (type === 'dkim' && selector) {
        params.append('selector', selector);
      }

      const response = await fetch(`/api/dns/lookup?${params.toString()}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lookup failed');
      }

      setResult(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const renderValidation = (type: 'dmarc' | 'spf' | 'dkim', record: string | null) => {
    if (!record) {
      const recommendations = getRecommendations(type, null);
      return (
        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No {type.toUpperCase()} record found for this domain.
            </AlertDescription>
          </Alert>

          {recommendations.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Recommendations:</h4>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <Alert key={idx}>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    let issues: ValidationIssue[] = [];
    let parsed: any = null;

    switch (type) {
      case 'dmarc':
        issues = validateDMARCRecord(record);
        parsed = parseDMARCRecord(record);
        break;
      case 'spf':
        issues = validateSPFRecord(record);
        parsed = parseSPFRecord(record);
        break;
      case 'dkim':
        issues = validateDKIMRecord(record);
        parsed = parseDKIMRecord(record);
        break;
    }

    const recommendations = getRecommendations(type, record);

    return (
      <div className="space-y-4">
        {/* Record Display */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Record Found:</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(record)}
              className="h-8 px-2"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="bg-muted p-3 rounded-md">
            <code className="text-sm break-all">{record}</code>
          </div>
        </div>

        {/* Parsed Details */}
        {parsed && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Parsed Values:</Label>
            <div className="bg-muted/50 p-3 rounded-md space-y-1">
              {type === 'dmarc' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Policy:</span>
                    <Badge variant={parsed.policy === 'reject' ? 'default' : parsed.policy === 'quarantine' ? 'secondary' : 'outline'}>
                      {parsed.policy}
                    </Badge>
                  </div>
                  {parsed.subdomainPolicy && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subdomain Policy:</span>
                      <Badge variant="outline">{parsed.subdomainPolicy}</Badge>
                    </div>
                  )}
                  {parsed.percentage && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Percentage:</span>
                      <span>{parsed.percentage}%</span>
                    </div>
                  )}
                  {parsed.ruaEmails && parsed.ruaEmails.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Aggregate Reports:</span>
                      <span className="text-xs">{parsed.ruaEmails.join(', ')}</span>
                    </div>
                  )}
                  {parsed.rufEmails && parsed.rufEmails.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Forensic Reports:</span>
                      <span className="text-xs">{parsed.rufEmails.join(', ')}</span>
                    </div>
                  )}
                </>
              )}
              {type === 'spf' && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Version:</span>
                    <span>{parsed.version}</span>
                  </div>
                  {parsed.includes.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Includes:</span>
                      <span className="text-xs">{parsed.includes.join(', ')}</span>
                    </div>
                  )}
                  {parsed.ipv4.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IPv4:</span>
                      <span className="text-xs">{parsed.ipv4.join(', ')}</span>
                    </div>
                  )}
                  {parsed.hasAll && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">All Mechanism:</span>
                      <Badge variant={parsed.qualifier === 'fail' ? 'default' : 'outline'}>
                        {parsed.qualifier}
                      </Badge>
                    </div>
                  )}
                </>
              )}
              {type === 'dkim' && (
                <>
                  {parsed.version && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Version:</span>
                      <span>{parsed.version}</span>
                    </div>
                  )}
                  {parsed.keyType && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Key Type:</span>
                      <span>{parsed.keyType}</span>
                    </div>
                  )}
                  {parsed.publicKey && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Public Key:</span>
                      <span className="text-xs truncate max-w-[200px]">{parsed.publicKey.substring(0, 30)}...</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Validation Issues */}
        {issues.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Validation Results:</Label>
            <div className="space-y-2">
              {issues.map((issue, idx) => (
                <Alert
                  key={idx}
                  variant={issue.severity === 'error' ? 'destructive' : 'default'}
                >
                  {issue.severity === 'error' && <AlertCircle className="h-4 w-4" />}
                  {issue.severity === 'warning' && <AlertTriangle className="h-4 w-4" />}
                  {issue.severity === 'info' && <Info className="h-4 w-4" />}
                  <AlertDescription className="text-sm">
                    {issue.field && <strong>{issue.field}: </strong>}
                    {issue.message}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Recommendations:</Label>
            <div className="space-y-2">
              {recommendations.map((rec, idx) => (
                <Alert key={idx}>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-sm">{rec}</AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Success badge if no errors */}
        {issues.filter((i) => i.severity === 'error').length === 0 && (
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              {type.toUpperCase()} record is valid!
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">DNS Tools</h1>
        <p className="text-muted-foreground mt-2">
          Lookup and validate DMARC, SPF, and DKIM records for any domain
        </p>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>DNS Record Lookup</CardTitle>
          <CardDescription>
            Enter a domain to check its email authentication records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="dmarc" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                DMARC
              </TabsTrigger>
              <TabsTrigger value="spf" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                SPF
              </TabsTrigger>
              <TabsTrigger value="dkim" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                DKIM
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dmarc" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dmarc-domain">Domain</Label>
                  <Input
                    id="dmarc-domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup('dmarc')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Will lookup _dmarc.example.com TXT record
                  </p>
                </div>

                <Button
                  onClick={() => handleLookup('dmarc')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Lookup DMARC Record
                    </>
                  )}
                </Button>
              </div>

              {result && renderValidation('dmarc', result.record)}
            </TabsContent>

            <TabsContent value="spf" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="spf-domain">Domain</Label>
                  <Input
                    id="spf-domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup('spf')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Will lookup example.com TXT record for SPF
                  </p>
                </div>

                <Button
                  onClick={() => handleLookup('spf')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Lookup SPF Record
                    </>
                  )}
                </Button>
              </div>

              {result && renderValidation('spf', result.record)}
            </TabsContent>

            <TabsContent value="dkim" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="dkim-selector">DKIM Selector</Label>
                  <Input
                    id="dkim-selector"
                    placeholder="default"
                    value={selector}
                    onChange={(e) => setSelector(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Common selectors: default, google, k1, s1, s2
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dkim-domain">Domain</Label>
                  <Input
                    id="dkim-domain"
                    placeholder="example.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLookup('dkim')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Will lookup {selector || 'selector'}._domainkey.example.com TXT record
                  </p>
                </div>

                <Button
                  onClick={() => handleLookup('dkim')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Lookup DKIM Record
                    </>
                  )}
                </Button>
              </div>

              {result && renderValidation('dkim', result.record)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>About Email Authentication</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">DMARC</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Domain-based Message Authentication, Reporting, and Conformance. Tells receiving
                servers what to do with emails that fail SPF or DKIM checks.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">SPF</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Sender Policy Framework. Lists which servers are authorized to send email on
                behalf of your domain.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">DKIM</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                DomainKeys Identified Mail. Uses cryptographic signatures to verify that emails
                have not been altered in transit.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
