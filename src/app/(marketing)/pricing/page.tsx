'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { PRICING, calculateMonthlyPrice, PRODUCT } from '@/lib/config';
import {
  CheckCircle2,
  ArrowRight,
  Mail,
  Brain,
  Bell,
  Globe,
  BarChart3,
  Shield,
  Users,
  Key,
  Server,
  Sparkles,
  Github,
  Zap,
} from 'lucide-react';

export default function PricingPage() {
  const [domainCount, setDomainCount] = useState(5);
  const monthlyPrice = calculateMonthlyPrice(domainCount);

  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] via-transparent to-transparent" />

        <div className="container mx-auto px-4 py-16 md:py-24 relative">
          <div className="text-center max-w-3xl mx-auto">
            <Badge variant="secondary" className="mb-6">Pricing</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Pay based on how many domains you monitor.
              <br className="hidden sm:block" />
              All features included with every plan.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Calculator */}
      <section className="py-12 md:py-16" aria-label="Pricing calculator">
        <div className="container mx-auto px-4">
          <div className="max-w-xl mx-auto">
            <Card className="border-2 shadow-lg overflow-hidden">
              <div className="bg-primary/5 px-6 py-4 border-b">
                <div className="flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-sm font-medium">Usage-Based Pricing</p>
                </div>
              </div>
              <CardContent className="pt-8 pb-8 space-y-8">
                {/* Domain Slider */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <Label className="text-base">Number of domains</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={domainCount}
                        onChange={(e) =>
                          setDomainCount(
                            Math.max(1, Math.min(100, parseInt(e.target.value) || 1))
                          )
                        }
                        className="w-20 text-center font-semibold"
                        aria-label="Number of domains"
                      />
                    </div>
                  </div>
                  <Slider
                    value={[domainCount]}
                    onValueChange={([value]) => setDomainCount(value)}
                    min={1}
                    max={50}
                    step={1}
                    className="py-2"
                    aria-label="Domain count slider"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1 domain</span>
                    <span>50+ domains</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Base platform fee</span>
                    <span className="font-medium">{PRICING.currencySymbol}{PRICING.baseFee}/mo</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {domainCount} domain{domainCount > 1 ? 's' : ''} x {PRICING.currencySymbol}{PRICING.perDomain}
                    </span>
                    <span className="font-medium">{PRICING.currencySymbol}{PRICING.perDomain * domainCount}/mo</span>
                  </div>
                  <div className="border-t border-border/50 pt-4 flex justify-between items-baseline">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-4xl font-bold">{PRICING.currencySymbol}{monthlyPrice}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="space-y-4">
                  <Button className="w-full h-12 text-base" asChild>
                    <Link href="/login">
                      Start {PRICING.trialDays}-Day Free Trial
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    No credit card required during trial
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Included */}
      <section className="py-16 md:py-20 bg-muted/30" aria-label="Features included">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">All Features Included</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">
              Everything you need, no upsells
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <IncludedFeature
              icon={Mail}
              title="Gmail/Workspace sync"
              description="Automatic report collection"
            />
            <IncludedFeature
              icon={Brain}
              title="AI recommendations"
              description="Powered by Google Gemini"
            />
            <IncludedFeature
              icon={Bell}
              title="Real-time alerts"
              description="Email and webhook notifications"
            />
            <IncludedFeature
              icon={Globe}
              title="Geographic tracking"
              description="Interactive world maps"
            />
            <IncludedFeature
              icon={BarChart3}
              title="Detailed analytics"
              description="Comprehensive dashboards"
            />
            <IncludedFeature
              icon={Shield}
              title="Source classification"
              description="Known provider matching"
            />
            <IncludedFeature
              icon={Users}
              title="Unlimited team members"
              description="No per-seat charges"
            />
            <IncludedFeature
              icon={Key}
              title="API access"
              description="Full REST API included"
            />
            <IncludedFeature
              icon={Server}
              title="Webhook integrations"
              description="Connect your tools"
            />
          </div>
        </div>
      </section>

      {/* Bring Your Own Keys */}
      <section className="py-16 md:py-20" aria-label="Bring your own API keys">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="overflow-hidden">
              <CardHeader className="bg-primary/5 border-b">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Bring Your Own API Keys</CardTitle>
                    <CardDescription className="mt-1">
                      Keep control of your data and costs
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <p className="text-muted-foreground">
                  {PRODUCT.name} is designed to work with your existing accounts and API keys,
                  keeping your data under your control and reducing our costs - which we pass on to you.
                </p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Brain className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Google Gemini</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI recommendations (free tier available)
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">Gmail/Workspace</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatic report sync via OAuth
                    </p>
                  </div>
                  <div className="rounded-lg border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-primary" />
                      <span className="font-medium text-sm">SMTP</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your email service for alerts
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Self-Hosted Option */}
      <section className="py-16 md:py-20 bg-muted/30" aria-label="Self-hosted option">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <Card className="overflow-hidden border-2 border-dashed">
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Github className="h-7 w-7 text-primary" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-xl font-semibold">Prefer to Self-Host?</h3>
                    <p className="text-muted-foreground">
                      {PRODUCT.name} is open source. Deploy it yourself using Docker with no
                      limits and no subscription fees. Same features, your infrastructure.
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <Button variant="outline" className="gap-2" asChild>
                      <a
                        href="https://github.com/helliott20/dmarc-analyser"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Github className="h-4 w-4" />
                        View on GitHub
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-20" aria-label="Frequently asked questions">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">FAQ</Badge>
              <h2 className="text-2xl md:text-3xl font-bold">
                Frequently Asked Questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="trial" className="border rounded-lg px-6 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  How does the free trial work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  Your {PRICING.trialDays}-day free trial starts when you create an account.
                  During the trial, you have full access to all features with no limits.
                  No credit card is required to start. At the end of the trial, you can
                  subscribe to continue using the service.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="domains" className="border rounded-lg px-6 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  What counts as a domain?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  Each unique domain you add for monitoring counts as one domain.
                  Subdomains (like mail.example.com) are tracked under their parent
                  domain and don't count separately. You're only charged for domains
                  you actively monitor.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="billing" className="border rounded-lg px-6 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  How does billing work?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  You're billed monthly based on the number of domains you're monitoring.
                  The base fee covers the platform access, and you pay {PRICING.currencySymbol}{PRICING.perDomain} per
                  domain per month. We track your domain count daily and bill based
                  on your usage at the end of each billing period.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="cancel" className="border rounded-lg px-6 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  Can I cancel anytime?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  Yes! You can cancel your subscription at any time from your account
                  settings. Your access will continue until the end of your current
                  billing period. We don't offer refunds for partial months, but you
                  won't be charged again after cancellation.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="self-host" className="border rounded-lg px-6 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  What's the difference between hosted and self-hosted?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  The hosted version (this service) includes managed infrastructure,
                  automatic updates, and support. The self-hosted version is the same
                  software deployed on your own servers using Docker. Self-hosting is
                  free but requires you to manage your own infrastructure, backups,
                  and updates.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="api-keys" className="border rounded-lg px-6 data-[state=open]:bg-muted/30">
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  Why do I need to bring my own API keys?
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  We designed {PRODUCT.name} to work with your existing accounts for
                  services like Google Gemini (AI) and Gmail. This keeps your data
                  under your control, allows you to use free tiers of these services,
                  and lets us offer lower prices since we don't need to resell these
                  services at a markup.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 md:py-24 bg-primary text-primary-foreground" aria-label="Get started">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex h-14 w-14 rounded-full bg-primary-foreground/10 items-center justify-center mb-6">
              <Zap className="h-7 w-7" />
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              Ready to get started?
            </h2>
            <p className="text-lg opacity-90 mb-8 max-w-lg mx-auto">
              Start your free trial today and protect your email reputation.
            </p>
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
            <p className="text-sm opacity-70 mt-4">
              No credit card required
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function IncludedFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Shield;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-background border transition-colors hover:border-primary/20">
      <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
