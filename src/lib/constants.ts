/**
 * Shared constants accessible from both server and client
 *
 * For server-only code, use central-inbox.ts which reads from process.env
 * For client components, use these constants which read from NEXT_PUBLIC_ env vars
 */

// Central inbox email for receiving DMARC reports
// Uses NEXT_PUBLIC_ prefix so it's available in client components
export const CENTRAL_INBOX_EMAIL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_CENTRAL_INBOX_EMAIL || 'reports@dmarcanalyser.io')
    : (process.env.CENTRAL_INBOX_EMAIL || process.env.NEXT_PUBLIC_CENTRAL_INBOX_EMAIL || 'reports@dmarcanalyser.io');
