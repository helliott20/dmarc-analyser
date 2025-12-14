import Stripe from 'stripe';
import { isSaasMode } from './config';

/**
 * Stripe client - only initialized in SaaS mode
 * Returns null if not in SaaS mode (self-hosted)
 */
export const stripe = isSaasMode()
  ? new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2025-11-17.clover',
      typescript: true,
    })
  : null;

/**
 * Get the Stripe client, throwing if not in SaaS mode
 */
export function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured. This feature requires SaaS mode.');
  }
  return stripe;
}

/**
 * Stripe Price IDs from environment
 */
export const STRIPE_PRICES = {
  base: process.env.STRIPE_PRICE_BASE || '',
  domain: process.env.STRIPE_PRICE_DOMAIN || '',
} as const;

/**
 * Check if Stripe prices are configured
 */
export function hasStripePrices(): boolean {
  return Boolean(STRIPE_PRICES.base && STRIPE_PRICES.domain);
}
