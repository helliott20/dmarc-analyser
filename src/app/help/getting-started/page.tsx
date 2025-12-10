import Link from 'next/link';
import {
  Building2,
  Globe,
  CheckCircle2,
  Mail,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';

const steps = [
  {
    number: 1,
    title: 'Create an Organization',
    icon: Building2,
    description:
      'Start by creating an organization to manage your domains. An organization represents your company or team.',
    steps: [
      'Click "Create Organization" from the dashboard',
      'Enter your organization name and details',
      'Customize branding (optional)',
      'Click "Create" to finish',
    ],
  },
  {
    number: 2,
    title: 'Add Your First Domain',
    icon: Globe,
    description:
      'Add the domain you want to monitor for DMARC compliance and email authentication.',
    steps: [
      'Navigate to the Domains page',
      'Click "Add Domain"',
      'Enter your domain name (e.g., example.com)',
      'Configure your DMARC policy settings',
      'Save the domain',
    ],
  },
  {
    number: 3,
    title: 'Verify Domain Ownership',
    icon: CheckCircle2,
    description:
      'Verify that you own the domain by adding DNS records provided by the system.',
    steps: [
      'Copy the DNS TXT record shown in the verification step',
      'Add the record to your domain\'s DNS settings',
      'Wait for DNS propagation (can take up to 48 hours)',
      'Click "Verify" to confirm ownership',
    ],
  },
  {
    number: 4,
    title: 'Connect Gmail for Report Import',
    icon: Mail,
    description:
      'Connect your Gmail account to automatically import DMARC reports sent to your reporting address.',
    steps: [
      'Go to Organization Settings > Gmail Import',
      'Click "Connect Gmail Account"',
      'Authorize the application to access your Gmail',
      'Configure the import schedule',
      'Save your settings',
    ],
  },
  {
    number: 5,
    title: 'Understanding Your Dashboard',
    icon: BarChart3,
    description:
      'Learn how to navigate and interpret the information on your dashboard.',
    steps: [
      'View overall compliance status across all domains',
      'Monitor recent report activity',
      'Check for new alerts and issues',
      'Review top sending sources',
      'Analyze authentication trends over time',
    ],
  },
];

const nextSteps = [
  {
    title: 'Learn DMARC Basics',
    description: 'Understand the fundamentals of DMARC and email authentication',
    href: '/help/dmarc-basics',
  },
  {
    title: 'Understanding Reports',
    description: 'Learn how to read and interpret DMARC reports',
    href: '/help/understanding-reports',
  },
  {
    title: 'Troubleshooting',
    description: 'Find solutions to common issues',
    href: '/help/troubleshooting',
  },
];

export default function GettingStartedPage() {
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
          <BreadcrumbPage>Getting Started</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Getting Started</h1>
        <p className="text-xl text-muted-foreground">
          Follow these steps to set up your first domain and start analyzing DMARC reports
        </p>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle>On This Page</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            {steps.map((step) => (
              <a
                key={step.number}
                href={`#step-${step.number}`}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {step.number}. {step.title}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.number} id={`step-${step.number}`} className="scroll-mt-8">
              <Card>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-primary text-primary-foreground w-10 h-10 flex items-center justify-center font-bold flex-shrink-0">
                      {step.number}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Icon className="h-5 w-5 text-primary" />
                        <CardTitle>{step.title}</CardTitle>
                      </div>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2 ml-14">
                    {step.steps.map((stepItem, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="text-muted-foreground font-medium mt-0.5">
                          {index + 1}.
                        </span>
                        <span className="text-muted-foreground">{stepItem}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Next Steps */}
      <div className="space-y-4 pt-8">
        <h2 className="text-2xl font-bold">Next Steps</h2>
        <p className="text-muted-foreground">
          Now that you've set up your account, explore these topics to learn more:
        </p>
        <div className="grid gap-4">
          {nextSteps.map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{item.title}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
