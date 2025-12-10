'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import {
  Shield,
  Copy,
  Check,
  AlertCircle,
  Info,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';

interface DMARCConfig {
  domain: string;
  policy: 'none' | 'quarantine' | 'reject';
  subdomainPolicy: 'inherit' | 'none' | 'quarantine' | 'reject';
  percentage: number;
  ruaEmails: string[];
  rufEmails: string[];
  dkimAlignment: 'r' | 's';
  spfAlignment: 'r' | 's';
  reportInterval: number;
  failureReporting: string;
}

const STEPS = [
  { id: 1, title: 'Domain', description: 'Enter your domain name' },
  { id: 2, title: 'Policy', description: 'Choose DMARC policy' },
  { id: 3, title: 'Subdomain', description: 'Subdomain policy' },
  { id: 4, title: 'Percentage', description: 'Gradual rollout' },
  { id: 5, title: 'Reporting', description: 'Report addresses' },
  { id: 6, title: 'Alignment', description: 'DKIM & SPF alignment' },
  { id: 7, title: 'Advanced', description: 'Advanced options' },
];

export default function DMARCGeneratorPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<DMARCConfig>({
    domain: '',
    policy: 'none',
    subdomainPolicy: 'inherit',
    percentage: 100,
    ruaEmails: [],
    rufEmails: [],
    dkimAlignment: 'r',
    spfAlignment: 'r',
    reportInterval: 86400,
    failureReporting: '0',
  });

  const [ruaInput, setRuaInput] = useState('');
  const [rufInput, setRufInput] = useState('');

  const generateDMARCRecord = (): string => {
    let record = 'v=DMARC1';

    record += `; p=${config.policy}`;

    if (config.subdomainPolicy !== 'inherit') {
      record += `; sp=${config.subdomainPolicy}`;
    }

    if (config.percentage < 100) {
      record += `; pct=${config.percentage}`;
    }

    if (config.ruaEmails.length > 0) {
      record += `; rua=${config.ruaEmails.map(email => `mailto:${email}`).join(',')}`;
    }

    if (config.rufEmails.length > 0) {
      record += `; ruf=${config.rufEmails.map(email => `mailto:${email}`).join(',')}`;
    }

    record += `; adkim=${config.dkimAlignment}`;
    record += `; aspf=${config.spfAlignment}`;

    if (config.reportInterval !== 86400) {
      record += `; ri=${config.reportInterval}`;
    }

    if (config.failureReporting !== '0') {
      record += `; fo=${config.failureReporting}`;
    }

    return record;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const getValidationWarnings = () => {
    const warnings: { severity: 'warning' | 'info' | 'error'; message: string }[] = [];

    if (!config.domain) {
      warnings.push({
        severity: 'error',
        message: 'Domain name is required',
      });
    }

    if (config.policy === 'reject' && config.percentage === 100) {
      warnings.push({
        severity: 'warning',
        message: 'Using p=reject at 100% without testing can cause legitimate emails to be rejected. Consider starting with p=none or using a lower percentage.',
      });
    }

    if (config.policy === 'quarantine' && config.percentage === 100) {
      warnings.push({
        severity: 'warning',
        message: 'Using p=quarantine at 100% without testing can cause legitimate emails to be quarantined. Consider starting with p=none or using a lower percentage.',
      });
    }

    if (config.ruaEmails.length === 0) {
      warnings.push({
        severity: 'info',
        message: 'No aggregate report (rua) email configured. You will not receive DMARC reports.',
      });
    }

    if (config.policy === 'none' && config.ruaEmails.length === 0) {
      warnings.push({
        severity: 'warning',
        message: 'Policy is set to "none" with no reporting configured. This provides minimal protection.',
      });
    }

    return warnings;
  };

  const addRuaEmail = () => {
    if (ruaInput && !config.ruaEmails.includes(ruaInput)) {
      setConfig({ ...config, ruaEmails: [...config.ruaEmails, ruaInput] });
      setRuaInput('');
    }
  };

  const removeRuaEmail = (email: string) => {
    setConfig({ ...config, ruaEmails: config.ruaEmails.filter((e) => e !== email) });
  };

  const addRufEmail = () => {
    if (rufInput && !config.rufEmails.includes(rufInput)) {
      setConfig({ ...config, rufEmails: [...config.rufEmails, rufInput] });
      setRufInput('');
    }
  };

  const removeRufEmail = (email: string) => {
    setConfig({ ...config, rufEmails: config.rufEmails.filter((e) => e !== email) });
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain Name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={config.domain}
                onChange={(e) => setConfig({ ...config, domain: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Enter your domain without the protocol (e.g., example.com, not https://example.com)
              </p>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                The DMARC record will be added to _dmarc.{config.domain || 'your-domain.com'} as a TXT record.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>DMARC Policy</Label>
              <RadioGroup
                value={config.policy}
                onValueChange={(value) =>
                  setConfig({ ...config, policy: value as 'none' | 'quarantine' | 'reject' })
                }
              >
                <div className="flex items-start space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="none" id="policy-none" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="policy-none" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">None</span>
                        <Badge variant="outline">Recommended for testing</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Monitor mode - no action taken on failed emails. Collect reports to understand your email flow.
                      </p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="quarantine" id="policy-quarantine" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="policy-quarantine" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Quarantine</span>
                        <Badge variant="secondary">Moderate protection</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Failed emails are sent to spam/junk folder. Good for testing before full enforcement.
                      </p>
                    </Label>
                  </div>
                </div>

                <div className="flex items-start space-x-2 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                  <RadioGroupItem value="reject" id="policy-reject" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="policy-reject" className="cursor-pointer">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Reject</span>
                        <Badge>Maximum protection</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Failed emails are rejected outright. Only use after thorough testing with p=none and p=quarantine.
                      </p>
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            </div>

            {config.policy !== 'none' && (
              <Alert variant="default">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Start with p=none to monitor your email authentication status before enforcing policies.
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subdomain Policy</Label>
              <Select
                value={config.subdomainPolicy}
                onValueChange={(value) =>
                  setConfig({
                    ...config,
                    subdomainPolicy: value as 'inherit' | 'none' | 'quarantine' | 'reject',
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inherit">
                    Inherit from main domain (recommended)
                  </SelectItem>
                  <SelectItem value="none">None - Monitor subdomains</SelectItem>
                  <SelectItem value="quarantine">Quarantine - Spam folder</SelectItem>
                  <SelectItem value="reject">Reject - Block completely</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Policy for subdomains (e.g., mail.{config.domain || 'example.com'})
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                If not specified (inherit), subdomains will use the same policy as the main domain. Use a different policy if you want stricter or looser rules for subdomains.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Percentage of emails to filter</Label>
                <Badge variant="outline">{config.percentage}%</Badge>
              </div>
              <Slider
                value={[config.percentage]}
                onValueChange={(value) => setConfig({ ...config, percentage: value[0] })}
                min={0}
                max={100}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    Use a percentage less than 100% for gradual rollout. This applies the policy to only a portion of your emails.
                  </p>
                  <p className="font-medium mt-2">Recommended rollout strategy:</p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>Start with p=none at 100% to collect reports</li>
                    <li>Review reports for 2-4 weeks</li>
                    <li>Move to p=quarantine at 10%, gradually increase</li>
                    <li>Move to p=reject at 10%, gradually increase to 100%</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Aggregate Reports (RUA)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="dmarc-reports@example.com"
                  value={ruaInput}
                  onChange={(e) => setRuaInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRuaEmail();
                    }
                  }}
                />
                <Button onClick={addRuaEmail} variant="outline">
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Email addresses to receive daily aggregate reports (XML format)
              </p>
              {config.ruaEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.ruaEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => removeRuaEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Forensic Reports (RUF)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="dmarc-forensic@example.com"
                  value={rufInput}
                  onChange={(e) => setRufInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addRufEmail();
                    }
                  }}
                />
                <Button onClick={addRufEmail} variant="outline">
                  Add
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Email addresses to receive individual failure reports (rarely supported)
              </p>
              {config.rufEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {config.rufEmails.map((email) => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      {email}
                      <button
                        onClick={() => removeRufEmail(email)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Aggregate reports (RUA) are sent daily and contain summary statistics. Most email providers support these. Forensic reports (RUF) contain copies of individual failed messages but are rarely supported due to privacy concerns.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>DKIM Alignment Mode</Label>
              <RadioGroup
                value={config.dkimAlignment}
                onValueChange={(value) =>
                  setConfig({ ...config, dkimAlignment: value as 'r' | 's' })
                }
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="r" id="dkim-relaxed" />
                  <Label htmlFor="dkim-relaxed" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Relaxed</span>
                      <Badge variant="outline">Recommended</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      DKIM domain can be a subdomain of the From: domain
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="s" id="dkim-strict" />
                  <Label htmlFor="dkim-strict" className="flex-1 cursor-pointer">
                    <span className="font-medium">Strict</span>
                    <p className="text-xs text-muted-foreground">
                      DKIM domain must exactly match the From: domain
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>SPF Alignment Mode</Label>
              <RadioGroup
                value={config.spfAlignment}
                onValueChange={(value) =>
                  setConfig({ ...config, spfAlignment: value as 'r' | 's' })
                }
              >
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="r" id="spf-relaxed" />
                  <Label htmlFor="spf-relaxed" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Relaxed</span>
                      <Badge variant="outline">Recommended</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      SPF domain can be a subdomain of the From: domain
                    </p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value="s" id="spf-strict" />
                  <Label htmlFor="spf-strict" className="flex-1 cursor-pointer">
                    <span className="font-medium">Strict</span>
                    <p className="text-xs text-muted-foreground">
                      SPF domain must exactly match the From: domain
                    </p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Relaxed alignment is recommended for most use cases. Strict alignment may cause issues if you use third-party email services.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-interval">Report Interval (seconds)</Label>
              <Select
                value={config.reportInterval.toString()}
                onValueChange={(value) =>
                  setConfig({ ...config, reportInterval: parseInt(value) })
                }
              >
                <SelectTrigger id="report-interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3600">1 hour</SelectItem>
                  <SelectItem value="21600">6 hours</SelectItem>
                  <SelectItem value="43200">12 hours</SelectItem>
                  <SelectItem value="86400">1 day (default)</SelectItem>
                  <SelectItem value="604800">1 week</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                How often you want to receive aggregate reports
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="failure-reporting">Failure Reporting Options</Label>
              <Select
                value={config.failureReporting}
                onValueChange={(value) => setConfig({ ...config, failureReporting: value })}
              >
                <SelectTrigger id="failure-reporting">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Report if all fail (default)</SelectItem>
                  <SelectItem value="1">Report if any fail</SelectItem>
                  <SelectItem value="d">Report if DKIM fails</SelectItem>
                  <SelectItem value="s">Report if SPF fails</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                When to generate forensic reports (rarely supported)
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Most email providers send aggregate reports daily regardless of this setting. The failure reporting option only applies to forensic reports (RUF), which are rarely supported.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  const dmarcRecord = generateDMARCRecord();
  const warnings = getValidationWarnings();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold tracking-tight">DMARC Record Generator</h1>
        </div>
        <p className="text-muted-foreground mt-2">
          Create a DMARC record for your domain with our step-by-step wizard
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Wizard */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                  <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
                </div>
                <Badge variant="outline">
                  Step {currentStep} of {STEPS.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step Indicators */}
              <div className="flex items-center justify-between">
                {STEPS.map((step, idx) => (
                  <div key={step.id} className="flex items-center">
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-medium ${
                        step.id === currentStep
                          ? 'border-primary bg-primary text-primary-foreground'
                          : step.id < currentStep
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-muted-foreground/20 text-muted-foreground'
                      }`}
                    >
                      {step.id}
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div
                        className={`w-8 h-0.5 mx-1 ${
                          step.id < currentStep ? 'bg-primary' : 'bg-muted-foreground/20'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              <div className="min-h-[300px]">{renderStep()}</div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                <Button
                  onClick={nextStep}
                  disabled={currentStep === STEPS.length}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Preview */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Record</CardTitle>
              <CardDescription>Live preview of your DMARC record</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Record:</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(dmarcRecord)}
                    className="h-8 px-2"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <code className="text-sm break-all">{dmarcRecord}</code>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">DNS Record Details:</Label>
                <div className="bg-muted/50 p-3 rounded-md space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <span className="ml-2 font-mono">TXT</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Host/Name:</span>
                    <span className="ml-2 font-mono">
                      _dmarc.{config.domain || 'your-domain.com'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Value:</span>
                    <span className="ml-2 font-mono break-all">{dmarcRecord}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">TTL:</span>
                    <span className="ml-2 font-mono">3600</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warnings */}
          {warnings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Validation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {warnings.map((warning, idx) => (
                  <Alert
                    key={idx}
                    variant={warning.severity === 'error' ? 'destructive' : 'default'}
                  >
                    {warning.severity === 'error' && <AlertCircle className="h-4 w-4" />}
                    {warning.severity === 'warning' && <AlertTriangle className="h-4 w-4" />}
                    {warning.severity === 'info' && <Info className="h-4 w-4" />}
                    <AlertDescription className="text-xs">{warning.message}</AlertDescription>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Add Your DMARC Record</CardTitle>
          <CardDescription>Follow these steps to configure DMARC for your domain</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium shrink-0">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Log in to your DNS provider</h3>
                <p className="text-sm text-muted-foreground">
                  Access your domain's DNS management console (e.g., Cloudflare, GoDaddy, Namecheap, Route 53)
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium shrink-0">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Add a new TXT record</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new DNS record with the following details:
                </p>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm font-mono space-y-1">
                  <div>Type: TXT</div>
                  <div>Name/Host: _dmarc.{config.domain || 'your-domain.com'}</div>
                  <div>Value: {dmarcRecord}</div>
                  <div>TTL: 3600 (or default)</div>
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium shrink-0">
                3
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Wait for DNS propagation</h3>
                <p className="text-sm text-muted-foreground">
                  DNS changes can take up to 48 hours to propagate, but usually complete within a few hours.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium shrink-0">
                4
              </div>
              <div className="flex-1">
                <h3 className="font-medium mb-1">Verify your record</h3>
                <p className="text-sm text-muted-foreground">
                  Use our{' '}
                  <a href="/tools" className="text-primary hover:underline">
                    DNS Lookup Tool
                  </a>{' '}
                  to verify your DMARC record is properly configured.
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Best Practice:</p>
              <p className="text-sm">
                Start with p=none and monitor your DMARC reports for several weeks before moving to p=quarantine or p=reject. This helps identify any legitimate email sources that may need to be configured properly.
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
