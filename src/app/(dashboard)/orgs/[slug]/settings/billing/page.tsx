'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { PRICING, calculateMonthlyPrice } from '@/lib/config';

interface BillingInfo {
  mode: 'saas' | 'self-hosted';
  canManageBilling: boolean;
  status?: string;
  trialEndsAt?: string | null;
  currentPeriodEnd?: string | null;
  domainCount?: number;
  monthlyPrice?: number;
  hasStripeSubscription?: boolean;
}

export default function BillingSettingsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const [loading, setLoading] = useState(true);
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Show success/cancel messages from Stripe redirect
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Subscription activated successfully!');
    } else if (searchParams.get('canceled') === 'true') {
      toast.info('Checkout was canceled');
    }
  }, [searchParams]);

  // Get redirect reason (e.g., trial_expired)
  const redirectReason = searchParams.get('reason');

  useEffect(() => {
    fetchBillingInfo();
  }, [slug]);

  const fetchBillingInfo = async () => {
    try {
      const response = await fetch(`/api/orgs/${slug}/billing`);
      if (!response.ok) throw new Error('Failed to fetch billing info');
      const data = await response.json();
      setBillingInfo(data);
    } catch (error) {
      console.error('Failed to fetch billing info:', error);
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: slug }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create checkout session');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to start checkout:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to start checkout');
      setActionLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setActionLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgSlug: slug }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to open billing portal');
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open portal:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to open billing portal');
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Self-hosted mode - no billing
  if (billingInfo?.mode === 'self-hosted') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">Manage your subscription</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Self-Hosted Mode
            </CardTitle>
            <CardDescription>
              You&apos;re running a self-hosted instance with all features unlocked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Self-hosted instances have unlimited access to all features.
              No subscription is required.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = billingInfo?.status || 'trialing';
  const trialEndsAt = billingInfo?.trialEndsAt
    ? new Date(billingInfo.trialEndsAt)
    : null;
  const currentPeriodEnd = billingInfo?.currentPeriodEnd
    ? new Date(billingInfo.currentPeriodEnd)
    : null;
  const daysRemaining = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <div className="space-y-6">
      {/* Access Blocked Alert */}
      {redirectReason && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">
                {redirectReason === 'trial_expired' && 'Your trial has expired'}
                {redirectReason === 'subscription_canceled' && 'Your subscription has been cancelled'}
                {redirectReason === 'payment_failed' && 'Your payment has failed'}
              </p>
              <p className="text-sm text-red-700 dark:text-red-300">
                {redirectReason === 'trial_expired' && 'Subscribe now to continue using DMARC Analyser and keep your data.'}
                {redirectReason === 'subscription_canceled' && 'Resubscribe to regain access to your organisation.'}
                {redirectReason === 'payment_failed' && 'Please update your payment method to continue.'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment
        </p>
      </div>

      {/* Subscription Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Status
              </CardTitle>
              <CardDescription>
                Your current plan and billing information
              </CardDescription>
            </div>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Trial Status */}
          {status === 'trialing' && trialEndsAt && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    Trial Active
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {daysRemaining > 0
                      ? `Your trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} (${trialEndsAt.toLocaleDateString()})`
                      : 'Your trial has expired'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Past Due Warning */}
          {status === 'past_due' && (
            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    Payment Past Due
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Please update your payment method to continue using the service.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Usage Summary */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Domains</p>
              <p className="text-2xl font-bold">{billingInfo?.domainCount || 0}</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                {status === 'trialing' ? 'Price after trial' : 'Monthly price'}
              </p>
              <p className="text-2xl font-bold">
                {PRICING.currencySymbol}{billingInfo?.monthlyPrice || calculateMonthlyPrice(billingInfo?.domainCount || 0)}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {PRICING.currencySymbol}{PRICING.baseFee} base + {PRICING.currencySymbol}{PRICING.perDomain}/domain
              </p>
            </div>
          </div>

          {/* Next Billing Date */}
          {currentPeriodEnd && status === 'active' && (
            <p className="text-sm text-muted-foreground">
              Next billing date: {currentPeriodEnd.toLocaleDateString()}
            </p>
          )}

          {/* Actions */}
          {billingInfo?.canManageBilling && (
            <div className="flex gap-3">
              {billingInfo?.hasStripeSubscription ? (
                <Button
                  onClick={handleManageSubscription}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="h-4 w-4 mr-2" />
                  )}
                  Manage Subscription
                </Button>
              ) : (
                <Button
                  onClick={handleSubscribe}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  {status === 'trialing' ? 'Subscribe Now' : 'Resubscribe'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing Reminder */}
      <Card>
        <CardHeader>
          <CardTitle>Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold">{PRICING.currencySymbol}{PRICING.baseFee}</span>
            <span className="text-muted-foreground">/month base</span>
            <span className="text-muted-foreground">+</span>
            <span className="text-3xl font-bold">{PRICING.currencySymbol}{PRICING.perDomain}</span>
            <span className="text-muted-foreground">/domain/month</span>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              All features included
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Unlimited team members
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Bring your own API keys
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Cancel anytime
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Active
        </Badge>
      );
    case 'trialing':
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
          <Clock className="h-3 w-3 mr-1" />
          Trial
        </Badge>
      );
    case 'past_due':
      return (
        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Past Due
        </Badge>
      );
    case 'canceled':
      return (
        <Badge variant="secondary">
          Canceled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}
