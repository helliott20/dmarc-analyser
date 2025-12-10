import Link from 'next/link';
import { AlertCircle, CheckCircle2, XCircle, Mail, Server, Settings } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

interface TroubleshootingItem {
  category: string;
  icon: React.ComponentType<{ className?: string }>;
  problems: {
    issue: string;
    symptoms: string[];
    solutions: string[];
  }[];
}

const troubleshootingItems: TroubleshootingItem[] = [
  {
    category: 'Authentication Issues',
    icon: AlertCircle,
    problems: [
      {
        issue: 'SPF Authentication Failing',
        symptoms: [
          'Reports show SPF failures for legitimate senders',
          'Emails from your domain are being marked as spam',
          'Messages from third-party services are failing SPF',
        ],
        solutions: [
          'Verify your SPF record includes all authorized sending IP addresses',
          'Check for the SPF record lookup limit (10 DNS lookups maximum)',
          'Use ip4/ip6 mechanisms instead of excessive includes when possible',
          'Ensure third-party email services (marketing tools, CRMs) are included in your SPF record',
          'Test your SPF record using the DNS Lookup tool',
        ],
      },
      {
        issue: 'DKIM Signatures Failing',
        symptoms: [
          'Reports show DKIM failures for your domain',
          'DKIM signatures are not validating',
          'Messages are passing SPF but failing DKIM',
        ],
        solutions: [
          'Verify your DKIM DNS records are published correctly',
          'Check that the DKIM selector matches between your email server and DNS',
          'Ensure the DKIM private key matches the public key in DNS',
          'Verify that email content is not being modified in transit (by mailing lists or forwarders)',
          'Check that DKIM signatures are not expiring too quickly',
        ],
      },
      {
        issue: 'Alignment Failures',
        symptoms: [
          'Both SPF and DKIM pass, but DMARC still fails',
          'Messages show "alignment=fail" in reports',
          'Different domains in From and Return-Path headers',
        ],
        solutions: [
          'Ensure the domain in the "From:" header matches your SPF domain (for SPF alignment)',
          'Verify the DKIM d= domain matches the "From:" domain (for DKIM alignment)',
          'Check if you need relaxed alignment instead of strict alignment',
          'Update your email server configuration to use matching domains',
          'Review subdomain alignment settings if using subdomains',
        ],
      },
    ],
  },
  {
    category: 'Report Issues',
    icon: Mail,
    problems: [
      {
        issue: 'Not Receiving DMARC Reports',
        symptoms: [
          'No aggregate reports arriving at your RUA address',
          'Sporadic or missing reports from major providers',
          'Reports stopping suddenly',
        ],
        solutions: [
          'Verify your DMARC record has the correct rua= tag with a valid email address',
          'Check that the reporting email address is not rejecting incoming reports',
          'Ensure your email server can receive large attachments (reports can be several MB)',
          'Wait 24-48 hours as reports are typically sent daily',
          'Test your DMARC record syntax using the DNS Lookup tool',
          'Check spam/junk folders for reports',
        ],
      },
      {
        issue: 'Unable to Parse Reports',
        symptoms: [
          'Reports arrive but show as unreadable',
          'XML parsing errors',
          'Compressed files that won\'t extract',
        ],
        solutions: [
          'Ensure you have proper tools to decompress gzip or zip files',
          'Use DMARC Analyser\'s automatic report import feature',
          'Connect Gmail import to automatically process reports',
          'Check that the report files are complete and not corrupted',
          'Verify you have the latest version of report processing tools',
        ],
      },
    ],
  },
  {
    category: 'Gmail Import Issues',
    icon: Server,
    problems: [
      {
        issue: 'Gmail Import Not Working',
        symptoms: [
          'No reports being imported from Gmail',
          'Authentication errors with Gmail',
          'Import status shows errors',
        ],
        solutions: [
          'Reconnect your Gmail account in Settings > Gmail Import',
          'Verify you granted all necessary permissions during OAuth',
          'Check that DMARC reports are actually arriving in your Gmail inbox',
          'Ensure the Gmail account has access to the reports',
          'Review Gmail import logs for specific error messages',
          'Try disconnecting and reconnecting the Gmail integration',
        ],
      },
    ],
  },
  {
    category: 'Configuration Issues',
    icon: Settings,
    problems: [
      {
        issue: 'High Volume of Failed Messages',
        symptoms: [
          'Large number of failures from unknown sources',
          'Sudden spike in authentication failures',
          'Many failed messages from unexpected IPs',
        ],
        solutions: [
          'Review your recent DNS changes that might affect SPF or DKIM',
          'Check if legitimate email services were recently added without updating SPF',
          'Monitor for potential spoofing or phishing campaigns using your domain',
          'Verify no recent changes to email server configurations',
          'Consider setting up alert rules to notify you of unusual activity',
        ],
      },
      {
        issue: 'Legitimate Emails Being Blocked',
        symptoms: [
          'Users report not receiving emails from your domain',
          'Important messages ending up in spam',
          'Business critical emails being rejected',
        ],
        solutions: [
          'Review your DMARC policy - consider moving from p=reject to p=quarantine temporarily',
          'Identify which sources are failing authentication',
          'Update SPF and DKIM for any failing legitimate sources',
          'Check subdomain policy if issues are with subdomains',
          'Ensure percentage tag (pct=) is not too aggressive if testing',
        ],
      },
    ],
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/help">Help</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Troubleshooting</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Troubleshooting</h1>
        <p className="text-xl text-muted-foreground">
          Solutions to common issues and problems with DMARC configuration and reports
        </p>
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Common Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {troubleshootingItems.map((category) => {
              const Icon = category.icon;
              return (
                <a
                  key={category.category}
                  href={`#${category.category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="flex items-center gap-3 p-3 rounded-md border hover:bg-muted transition-colors"
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="font-medium">{category.category}</span>
                </a>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Troubleshooting Sections */}
      <div className="space-y-8">
        {troubleshootingItems.map((category) => {
          const Icon = category.icon;
          return (
            <section
              key={category.category}
              id={category.category.toLowerCase().replace(/\s+/g, '-')}
              className="scroll-mt-8 space-y-4"
            >
              <div className="flex items-center gap-3">
                <Icon className="h-6 w-6 text-primary" />
                <h2 className="text-3xl font-bold">{category.category}</h2>
              </div>

              <div className="space-y-4">
                {category.problems.map((problem, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <CardTitle className="text-xl">{problem.issue}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Symptoms */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <h4 className="font-semibold text-sm">Symptoms</h4>
                        </div>
                        <ul className="space-y-1.5">
                          {problem.symptoms.map((symptom, idx) => (
                            <li key={idx} className="text-sm text-muted-foreground ml-6">
                              • {symptom}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Solutions */}
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <h4 className="font-semibold text-sm">Solutions</h4>
                        </div>
                        <ol className="space-y-2">
                          {problem.solutions.map((solution, idx) => (
                            <li key={idx} className="flex items-start gap-2.5">
                              <span className="text-sm font-medium text-muted-foreground mt-0.5 min-w-[20px]">
                                {idx + 1}.
                              </span>
                              <span className="text-sm text-muted-foreground">{solution}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {/* Additional Resources */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">
            If you're still experiencing issues, check out these resources:
          </p>
          <div className="space-y-2">
            <Link href="/help/dmarc-basics" className="block text-primary hover:underline">
              → DMARC Basics - Understanding how DMARC works
            </Link>
            <Link
              href="/help/understanding-reports"
              className="block text-primary hover:underline"
            >
              → Understanding Reports - Learn to interpret DMARC data
            </Link>
            <Link href="/help/glossary" className="block text-primary hover:underline">
              → Glossary - Common DMARC terms explained
            </Link>
            <Link href="/tools" className="block text-primary hover:underline">
              → DNS Lookup Tool - Test your DMARC, SPF, and DKIM records
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Still Need Help */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle>Still Need Help?</CardTitle>
          <CardDescription className="text-base">
            If you can't find a solution to your problem, here are some additional steps:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-muted-foreground">
            <li>• Check the audit log for recent configuration changes</li>
            <li>• Review alert notifications for automated issue detection</li>
            <li>• Use the DNS Lookup tool to verify your records</li>
            <li>• Check the timeline view for historical trends</li>
            <li>• Review known senders to ensure all legitimate sources are authorized</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
