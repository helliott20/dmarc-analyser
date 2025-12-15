import Link from 'next/link';
import { Shield, Lock, Mail, BarChart3, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

export default function DmarcBasicsPage() {
  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/login">Login</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/help">Help</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>DMARC Basics</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">DMARC Basics</h1>
        <p className="text-xl text-muted-foreground">
          Understanding DMARC and how it protects your email domain
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
              href="#what-is-dmarc"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              What is DMARC?
            </a>
            <a
              href="#how-it-works"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              How DMARC Works
            </a>
            <a
              href="#authentication-methods"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Authentication Methods
            </a>
            <a
              href="#policies"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              DMARC Policies
            </a>
            <a
              href="#benefits"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Benefits of DMARC
            </a>
          </nav>
        </CardContent>
      </Card>

      {/* What is DMARC */}
      <section id="what-is-dmarc" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">What is DMARC?</h2>
        <p className="text-muted-foreground text-lg">
          DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email
          authentication protocol that helps protect your domain from being used in email spoofing,
          phishing attacks, and other email-based fraud.
        </p>
        <p className="text-muted-foreground text-lg">
          DMARC builds on two existing authentication mechanisms: SPF (Sender Policy Framework) and
          DKIM (DomainKeys Identified Mail). It allows domain owners to:
        </p>
        <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
          <li>Specify which authentication methods are used for their domain</li>
          <li>Define how receiving servers should handle emails that fail authentication</li>
          <li>Receive reports about email authentication results</li>
        </ul>
      </section>

      {/* How DMARC Works */}
      <section id="how-it-works" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">How DMARC Works</h2>
        <p className="text-muted-foreground text-lg">
          When an email is received, the receiving mail server performs these steps:
        </p>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <CardTitle className="text-lg">Check SPF and DKIM</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The server verifies the email using SPF and/or DKIM authentication methods to
                ensure the email comes from an authorized source.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <CardTitle className="text-lg">Verify Alignment</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The server checks if the domain in the "From:" header aligns with the domain
                authenticated by SPF or DKIM.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <CardTitle className="text-lg">Apply DMARC Policy</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Based on the DMARC policy published in DNS, the server decides whether to deliver,
                quarantine, or reject the email.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary text-primary-foreground w-8 h-8 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <CardTitle className="text-lg">Send Reports</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                The receiving server sends aggregate reports to the addresses specified in your
                DMARC record, providing visibility into email authentication results.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Authentication Methods */}
      <section id="authentication-methods" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Authentication Methods</h2>
        <p className="text-muted-foreground text-lg">
          DMARC relies on two primary authentication mechanisms:
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>SPF (Sender Policy Framework)</CardTitle>
              </div>
              <CardDescription className="text-base">
                SPF allows domain owners to specify which IP addresses and mail servers are
                authorized to send email on behalf of their domain.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Example SPF Record:</p>
                <code className="block bg-muted px-3 py-2 rounded-md text-xs">
                  v=spf1 ip4:192.0.2.0/24 include:_spf.example.com ~all
                </code>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>DKIM (DomainKeys Identified Mail)</CardTitle>
              </div>
              <CardDescription className="text-base">
                DKIM adds a digital signature to email headers, allowing the receiving server to
                verify that the email was authorized by the domain owner and hasn't been altered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                DKIM signatures are added to email headers and verified using public keys
                published in DNS records.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* DMARC Policies */}
      <section id="policies" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">DMARC Policies</h2>
        <p className="text-muted-foreground text-lg">
          DMARC allows you to specify what receiving mail servers should do with emails that fail
          authentication:
        </p>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">p=none (Monitor Only)</CardTitle>
              <CardDescription className="text-base">
                No action is taken on failed messages. This is the recommended starting policy for
                monitoring your email traffic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block bg-muted px-3 py-2 rounded-md text-sm">
                v=DMARC1; p=none; rua=mailto:dmarc@example.com
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">p=quarantine (Mark as Spam)</CardTitle>
              <CardDescription className="text-base">
                Failed messages are marked as suspicious and typically sent to the spam or junk
                folder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block bg-muted px-3 py-2 rounded-md text-sm">
                v=DMARC1; p=quarantine; rua=mailto:dmarc@example.com
              </code>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">p=reject (Block Delivery)</CardTitle>
              <CardDescription className="text-base">
                Failed messages are rejected and not delivered to the recipient. This is the
                strongest policy providing maximum protection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <code className="block bg-muted px-3 py-2 rounded-md text-sm">
                v=DMARC1; p=reject; rua=mailto:dmarc@example.com
              </code>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="scroll-mt-8 space-y-4">
        <h2 className="text-3xl font-bold">Benefits of DMARC</h2>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>Brand Protection</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Prevent attackers from spoofing your domain in phishing and email fraud attacks,
                protecting your brand reputation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle>Visibility and Reporting</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Gain insights into who is sending email on behalf of your domain and identify
                unauthorized senders.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <CardTitle>Improved Deliverability</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Legitimate emails are more likely to reach the inbox when DMARC is properly
                configured and enforced.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-primary" />
                <CardTitle>Reduced Phishing Risk</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Make it harder for attackers to impersonate your domain, reducing the risk to your
                customers and partners.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Next Steps */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-muted-foreground">Continue learning about DMARC:</p>
          <div className="space-y-2">
            <Link
              href="/help/understanding-reports"
              className="block text-primary hover:underline"
            >
              → Understanding DMARC Reports
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
