/**
 * Application configuration and mode detection
 */

/**
 * Check if the app is running in SaaS mode (with Stripe billing)
 * Self-hosted mode: No Stripe = unlimited everything, no billing
 * SaaS mode: Stripe configured = enforce trial/subscription
 */
export const isSaasMode = () => !!process.env.STRIPE_SECRET_KEY;

/**
 * Pricing configuration
 */
export const PRICING = {
  baseFee: 10, // £10/month
  perDomain: 3, // £3/domain/month
  trialDays: 14,
  currency: 'GBP',
  currencySymbol: '£',
} as const;

/**
 * Calculate monthly price for a given number of domains
 */
export function calculateMonthlyPrice(domainCount: number): number {
  return PRICING.baseFee + PRICING.perDomain * domainCount;
}

/**
 * Product name and branding
 */
export const PRODUCT = {
  name: 'DMARC Analyser',
  tagline: 'Monitor & Protect Your Email Reputation',
  description: 'DMARC monitoring made simple',
  company: 'Redactbox',
  companyUrl: 'https://redactbox.co.uk',
} as const;
