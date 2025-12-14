'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { X, Clock, ArrowRight } from 'lucide-react';

interface TrialBannerProps {
  orgSlug: string;
  trialEndsAt: string | null;
  status: string;
}

export function TrialBanner({ orgSlug, trialEndsAt, status }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  // Check if banner was dismissed in this session
  useEffect(() => {
    const dismissedKey = `trial-banner-dismissed-${orgSlug}`;
    const dismissedAt = sessionStorage.getItem(dismissedKey);
    if (dismissedAt) {
      setDismissed(true);
    }
  }, [orgSlug]);

  const handleDismiss = () => {
    const dismissedKey = `trial-banner-dismissed-${orgSlug}`;
    sessionStorage.setItem(dismissedKey, Date.now().toString());
    setDismissed(true);
  };

  // Don't show if not trialing
  if (status !== 'trialing') return null;

  // Don't show if dismissed
  if (dismissed) return null;

  // Don't show if no trial end date
  if (!trialEndsAt) return null;

  const trialEnd = new Date(trialEndsAt);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Only show if 7 days or less remaining
  if (daysRemaining > 7) return null;

  const isExpired = daysRemaining <= 0;
  const isUrgent = daysRemaining <= 3;

  return (
    <div
      className={`relative flex items-center justify-between gap-4 px-4 py-3 text-sm ${
        isExpired
          ? 'bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900'
          : isUrgent
          ? 'bg-yellow-50 dark:bg-yellow-950/30 border-b border-yellow-200 dark:border-yellow-900'
          : 'bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-900'
      }`}
    >
      <div className="flex items-center gap-3">
        <Clock
          className={`h-4 w-4 ${
            isExpired
              ? 'text-red-500'
              : isUrgent
              ? 'text-yellow-500'
              : 'text-blue-500'
          }`}
        />
        <span
          className={
            isExpired
              ? 'text-red-700 dark:text-red-300'
              : isUrgent
              ? 'text-yellow-700 dark:text-yellow-300'
              : 'text-blue-700 dark:text-blue-300'
          }
        >
          {isExpired
            ? 'Your trial has expired. Subscribe to continue using all features.'
            : `Your trial ends in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''}. Subscribe to keep your data.`}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" asChild>
          <Link href={`/orgs/${orgSlug}/settings/billing`}>
            Subscribe Now
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
        {!isExpired && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}
