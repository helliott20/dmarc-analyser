import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PRODUCT, PRICING, calculateMonthlyPrice } from '@/lib/config';
import { SEO } from '@/lib/seo';
import {
  Shield,
  Mail,
  Brain,
  Bell,
  Globe,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  Zap,
  Lock,
  Github,
  TrendingUp,
  AlertTriangle,
  Target,
  Users,
  FileText,
  Webhook,
  Calendar,
  Tags,
  Search,
} from 'lucide-react';

export const metadata: Metadata = {
  title: SEO.home.title,
  description: SEO.home.description,
  keywords: SEO.home.keywords,
  openGraph: {
    type: 'website',
    url: 'https://dmarc-analyser.com',
    title: SEO.home.title,
    description: SEO.home.description,
    siteName: 'DMARC Analyser',
    images: [
      {
        url: 'https://dmarc-analyser.com/og-image-home.png',
        width: 1200,
        height: 630,
        alt: 'DMARC Analyser - Monitor & Protect Email Reputation',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SEO.home.title,
    description: SEO.home.description,
    images: ['https://dmarc-analyser.com/og-image-home.png'],
  },
  alternates: {
    canonical: 'https://dmarc-analyser.com',
  },
};

export default function HomePage() {
  // Debug logging - remove after fixing
  console.log('[MARKETING PAGE] Rendering home page');

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(120,119,198,0.1),transparent)]" />

        <div className="container mx-auto px-4 py-24 md:py-32 lg:py-40 relative">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="mb-8 inline-flex">
              <Badge
                variant="outline"
                className="px-4 py-1.5 text-sm font-medium border-primary/20 bg-primary/5"
              >
                <Github className="mr-2 h-3.5 w-3.5" />
                Open Source & Self-Hostable
              </Badge>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
              Stop Email Spoofing.
              <br />
              <span className="text-muted-foreground">Protect Your Brand.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
              Monitor your DMARC reports in real-time, identify unauthorized senders,
              and get AI-powered recommendations to improve your email deliverability.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" className="h-12 px-8 text-base" asChild>
                <Link href="/login">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base" asChild>
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                {PRICING.trialDays}-day free trial
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Cancel anytime
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / Problem statement */}
      <section className="border-y bg-muted/30 py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-destructive mb-2">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <p className="text-2xl md:text-3xl font-bold">3.4B</p>
              <p className="text-sm text-muted-foreground">phishing emails sent daily</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-warning mb-2">
                <TrendingUp className="h-5 w-5" />
              </div>
              <p className="text-2xl md:text-3xl font-bold">91%</p>
              <p className="text-sm text-muted-foreground">of cyberattacks start with email</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-success mb-2">
                <Target className="h-5 w-5" />
              </div>
              <p className="text-2xl md:text-3xl font-bold">10x</p>
              <p className="text-sm text-muted-foreground">better deliverability with DMARC</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-28" aria-label="Features">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Everything you need for
              <br className="hidden sm:block" />
              DMARC monitoring
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive tools to monitor, analyze, and improve your email authentication
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <FeatureCard
              icon={Mail}
              title="Gmail/Workspace Sync"
              description="Automatically sync DMARC reports from your Gmail or Google Workspace account. Auto-discover domains from incoming reports."
              highlight
            />
            <FeatureCard
              icon={Brain}
              title="AI Recommendations"
              description="Get intelligent policy recommendations powered by Google Gemini. Know when you're ready for stricter DMARC policies."
              highlight
            />
            <FeatureCard
              icon={Bell}
              title="Real-time Alerts"
              description="Receive instant notifications when authentication failures spike, new sources appear, or DNS records change."
            />
            <FeatureCard
              icon={Globe}
              title="Geographic Tracking"
              description="Visualize where your emails are being sent from with interactive world maps and IP geolocation data."
            />
            <FeatureCard
              icon={BarChart3}
              title="Detailed Analytics"
              description="Track SPF/DKIM pass rates, message volumes, and authentication trends with comprehensive dashboards."
            />
            <FeatureCard
              icon={Shield}
              title="Source Classification"
              description="Automatically identify and classify sending sources. Match against 50+ known providers and flag suspicious activity."
            />
            <FeatureCard
              icon={Calendar}
              title="Scheduled Reports"
              description="Receive automated email summaries of your DMARC performance - daily, weekly, or monthly digests."
            />
            <FeatureCard
              icon={Webhook}
              title="Webhook Integrations"
              description="Connect to Slack, Discord, Microsoft Teams, or custom webhooks for real-time notifications."
            />
            <FeatureCard
              icon={Users}
              title="Team Collaboration"
              description="Invite unlimited team members with role-based access control. Owner, admin, member, and viewer roles."
            />
            <FeatureCard
              icon={Tags}
              title="Domain Organization"
              description="Tag and categorize domains for better organization. Filter by business unit, client, or custom labels."
            />
            <FeatureCard
              icon={Search}
              title="DNS Validation"
              description="Automatic SPF, DKIM, and DMARC record validation with detailed diagnostics and fix recommendations."
            />
            <FeatureCard
              icon={FileText}
              title="Data Export"
              description="Export your DMARC data anytime. Full data portability with CSV and JSON export options."
            />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-muted/30" aria-label="How it works">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4">How it works</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Get started in minutes
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Simple setup, powerful results
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 md:gap-4 relative">
              {/* Connector line - hidden on mobile */}
              <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-transparent via-border to-transparent" />

              <StepCard
                number={1}
                title="Connect your domain"
                description="Add your domain and configure DMARC to send reports to us, or sync directly from Gmail."
              />
              <StepCard
                number={2}
                title="Receive reports"
                description="We automatically parse and analyze aggregate and forensic DMARC reports as they arrive."
              />
              <StepCard
                number={3}
                title="Get insights"
                description="View dashboards, receive alerts, and get AI-powered recommendations to improve security."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 md:py-28" aria-label="Pricing">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">Pricing</Badge>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Simple, transparent pricing
              </h2>
              <p className="text-lg text-muted-foreground">
                Pay only for what you use. All features included.
              </p>
            </div>

            <Card className="max-w-lg mx-auto border-2 overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b">
                <p className="text-sm font-medium text-center">Usage-Based Pricing</p>
              </div>
              <CardContent className="pt-8 pb-8">
                <div className="text-center mb-8">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-5xl font-bold">{PRICING.currencySymbol}{PRICING.baseFee}</span>
                    <span className="text-muted-foreground">/month base</span>
                  </div>
                  <p className="text-muted-foreground mt-2">
                    + {PRICING.currencySymbol}{PRICING.perDomain} per domain/month
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 mb-8">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Example: 5 domains</span>
                    <span className="font-semibold">{PRICING.currencySymbol}{calculateMonthlyPrice(5)}/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  <PricingFeature>All features included</PricingFeature>
                  <PricingFeature>{PRICING.trialDays}-day free trial</PricingFeature>
                  <PricingFeature>Bring your own API keys</PricingFeature>
                  <PricingFeature>Unlimited team members</PricingFeature>
                  <PricingFeature>Priority support</PricingFeature>
                </ul>

                <Button className="w-full h-12 text-base" asChild>
                  <Link href="/pricing">
                    Calculate Your Price
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <p className="text-center text-sm text-muted-foreground mt-6">
              Prefer to self-host?{' '}
              <a
                href="https://github.com/helliott20/dmarc-analyser"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline underline-offset-4 hover:text-primary transition-colors"
              >
                Deploy with Docker
              </a>{' '}
              for free.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 bg-primary text-primary-foreground" aria-label="Call to action">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6">
              Ready to protect your email reputation?
            </h2>
            <p className="text-lg opacity-90 mb-10 max-w-xl mx-auto">
              Join thousands of businesses using DMARC to prevent email spoofing and improve deliverability.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="h-12 px-8 text-base"
                asChild
              >
                <Link href="/login">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground"
                asChild
              >
                <Link href="/pricing">View Pricing</Link>
              </Button>
            </div>
            <p className="text-sm opacity-70 mt-6">
              No credit card required. {PRICING.trialDays}-day free trial.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  highlight = false,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <Card className={`group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/20 ${highlight ? 'border-primary/10 bg-primary/[0.02]' : ''}`}>
      <CardContent className="pt-6">
        <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-5 transition-colors ${highlight ? 'bg-primary text-primary-foreground' : 'bg-primary/10 group-hover:bg-primary/15'}`}>
          <Icon className={`h-6 w-6 ${highlight ? '' : 'text-primary'}`} />
        </div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </CardContent>
    </Card>
  );
}

function StepCard({
  number,
  title,
  description,
}: {
  number: number;
  title: string;
  description: string;
}) {
  return (
    <div className="relative text-center">
      <div className="inline-flex h-14 w-14 md:h-16 md:w-16 rounded-full bg-primary text-primary-foreground items-center justify-center text-xl md:text-2xl font-bold mb-6 relative z-10 shadow-lg">
        {number}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">{description}</p>
    </div>
  );
}

function PricingFeature({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}
