import Link from 'next/link';
import { FileText, BarChart3, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

export default function UnderstandingReportsPage() {
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
          <BreadcrumbPage>Understanding Reports</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Understanding DMARC Reports</h1>
        <p className="text-xl text-muted-foreground">
          Learn how to read and interpret DMARC aggregate and forensic reports
        </p>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle>On This Page</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            <a
              href="#report-types"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Types of DMARC Reports
            </a>
            <a
              href="#aggregate-reports"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Aggregate Reports (RUA)
            </a>
            <a
              href="#forensic-reports"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Forensic Reports (RUF)
            </a>
            <a
              href="#key-metrics"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Key Metrics to Monitor
            </a>
            <a
              href="#interpreting-results"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Interpreting Results
            </a>
          </nav>
        </CardContent>
      </Card>

      {/* Report Types */}
      <section id="report-types" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Types of DMARC Reports</h2>
        <p className="text-muted-foreground text-lg">
          DMARC provides two types of reports to help you monitor and analyze email authentication
          for your domain:
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Aggregate Reports (RUA)</CardTitle>
              </div>
              <CardDescription className="text-base">
                Summary reports sent daily by receiving mail servers containing statistics about
                email authentication results.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Sent to the address in your DMARC rua tag</li>
                <li>• Typically sent once per day</li>
                <li>• Contain aggregated statistics</li>
                <li>• Most commonly used for monitoring</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-5 w-5 text-primary" />
                <CardTitle>Forensic Reports (RUF)</CardTitle>
              </div>
              <CardDescription className="text-base">
                Individual detailed reports sent when specific messages fail DMARC authentication.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Sent to the address in your DMARC ruf tag</li>
                <li>• Sent in real-time for failures</li>
                <li>• Contain detailed message information</li>
                <li>• Less commonly implemented by receivers</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Aggregate Reports */}
      <section id="aggregate-reports" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Aggregate Reports (RUA)</h2>
        <p className="text-muted-foreground text-lg">
          Aggregate reports provide a high-level view of email authentication activity for your
          domain. Here's what they contain:
        </p>

        <Card>
          <CardHeader>
            <CardTitle>Report Structure</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">Report Metadata</h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• Organization sending the report (e.g., Gmail, Outlook)</li>
                <li>• Reporting date range</li>
                <li>• Contact information</li>
                <li>• Report ID</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Policy Information</h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• Your domain</li>
                <li>• DMARC policy applied (none, quarantine, reject)</li>
                <li>• Subdomain policy</li>
                <li>• Alignment mode (relaxed or strict)</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Authentication Results</h4>
              <ul className="space-y-1 text-sm text-muted-foreground ml-4">
                <li>• Source IP address</li>
                <li>• Number of messages from each source</li>
                <li>• SPF authentication results</li>
                <li>• DKIM authentication results</li>
                <li>• DMARC disposition (what action was taken)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How to Use Aggregate Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="font-semibold mt-0.5">1.</span>
                <div>
                  <p className="font-medium">Identify all legitimate senders</p>
                  <p className="text-sm text-muted-foreground">
                    Review which IP addresses and domains are sending email on your behalf
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold mt-0.5">2.</span>
                <div>
                  <p className="font-medium">Monitor authentication pass rates</p>
                  <p className="text-sm text-muted-foreground">
                    Track how many messages are passing SPF and DKIM authentication
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold mt-0.5">3.</span>
                <div>
                  <p className="font-medium">Detect unauthorized senders</p>
                  <p className="text-sm text-muted-foreground">
                    Find sources sending email from your domain that shouldn't be
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-semibold mt-0.5">4.</span>
                <div>
                  <p className="font-medium">Fix authentication issues</p>
                  <p className="text-sm text-muted-foreground">
                    Update SPF and DKIM configurations for legitimate senders that are failing
                  </p>
                </div>
              </li>
            </ol>
          </CardContent>
        </Card>
      </section>

      {/* Forensic Reports */}
      <section id="forensic-reports" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Forensic Reports (RUF)</h2>
        <p className="text-muted-foreground text-lg">
          Forensic reports provide detailed information about individual messages that fail DMARC
          authentication. These reports are less common but can be valuable for troubleshooting.
        </p>

        <Card>
          <CardHeader>
            <CardTitle>What Forensic Reports Include</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-muted-foreground">
              <li>• Complete email headers</li>
              <li>• Source IP address and hostname</li>
              <li>• Authentication failure reasons</li>
              <li>• SPF and DKIM results</li>
              <li>• Sometimes parts of the message body</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
              <div>
                <CardTitle className="text-amber-900 dark:text-amber-100">
                  Important Note
                </CardTitle>
                <CardDescription className="text-amber-800 dark:text-amber-200">
                  Many mail providers don't send forensic reports due to privacy concerns, as they
                  may contain sensitive message content. Don't rely solely on forensic reports for
                  monitoring.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </section>

      {/* Key Metrics */}
      <section id="key-metrics" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Key Metrics to Monitor</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <CardTitle>DMARC Pass Rate</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The percentage of emails that pass DMARC authentication. Aim for 95%+ pass rate
                for legitimate sources.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Message Volume</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track the total number of messages and identify unusual spikes that might indicate
                abuse or configuration issues.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <XCircle className="h-5 w-5 text-red-600" />
                <CardTitle>Authentication Failures</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Monitor SPF and DKIM failures to identify legitimate senders that need
                configuration updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <CardTitle>Source Distribution</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Review which IP addresses and sending sources are using your domain to detect
                unauthorized usage.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Interpreting Results */}
      <section id="interpreting-results" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Interpreting Results</h2>

        <Card>
          <CardHeader>
            <CardTitle>Common Scenarios</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <p className="font-semibold text-green-900 dark:text-green-100">
                SPF Pass + DKIM Pass
              </p>
              <p className="text-sm text-muted-foreground">
                Best case scenario. The email is authenticated and from a legitimate source.
              </p>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                SPF Fail + DKIM Pass
              </p>
              <p className="text-sm text-muted-foreground">
                Common with forwarded emails. DKIM signature remains valid even after forwarding,
                but SPF may fail.
              </p>
            </div>

            <div className="border-l-4 border-amber-500 pl-4">
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                SPF Pass + DKIM Fail
              </p>
              <p className="text-sm text-muted-foreground">
                May indicate DKIM configuration issues or message modification during transit.
                Review your DKIM setup.
              </p>
            </div>

            <div className="border-l-4 border-red-500 pl-4">
              <p className="font-semibold text-red-900 dark:text-red-100">
                SPF Fail + DKIM Fail
              </p>
              <p className="text-sm text-muted-foreground">
                Likely unauthorized sender or spoofing attempt. Investigate the source IP address
                and consider blocking.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Next Steps */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Learn more about DMARC:</p>
          <div className="space-y-2">
            <Link href="/help/dmarc-basics" className="block text-primary hover:underline">
              → DMARC Basics
            </Link>
            <Link href="/help/glossary" className="block text-primary hover:underline">
              → DMARC Glossary
            </Link>
            <Link href="/help/troubleshooting" className="block text-primary hover:underline">
              → Troubleshooting Common Issues
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
