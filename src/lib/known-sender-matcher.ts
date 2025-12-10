import { db } from '@/db';
import { knownSenders, sources, dkimResults, records } from '@/db/schema';
import { eq, or, inArray } from 'drizzle-orm';
import { Address4, Address6 } from 'ip-address';

interface KnownSender {
  id: string;
  name: string;
  ipRanges: string[] | null;
  dkimDomains: string[] | null;
  isGlobal: boolean;
  organizationId: string | null;
}

/**
 * Check if an IP address is within a CIDR range
 */
function ipInRange(ip: string, cidr: string): boolean {
  try {
    // Try IPv4 first
    try {
      const address = new Address4(ip);
      const range = new Address4(cidr);
      return address.isInSubnet(range);
    } catch {
      // Try IPv6
      const address = new Address6(ip);
      const range = new Address6(cidr);
      return address.isInSubnet(range);
    }
  } catch {
    // Invalid IP or CIDR format
    return false;
  }
}

/**
 * Check if a DKIM domain matches a known sender's DKIM domains
 * Supports exact match and subdomain matching
 */
function dkimDomainMatches(dkimDomain: string, knownDomains: string[]): boolean {
  const normalized = dkimDomain.toLowerCase();

  for (const knownDomain of knownDomains) {
    const normalizedKnown = knownDomain.toLowerCase();

    // Exact match
    if (normalized === normalizedKnown) {
      return true;
    }

    // Subdomain match (e.g., "mail.google.com" matches "google.com")
    if (normalized.endsWith(`.${normalizedKnown}`)) {
      return true;
    }
  }

  return false;
}

/**
 * Match a source IP to known senders
 */
export async function matchSourceByIp(
  ip: string,
  organizationId: string
): Promise<KnownSender | null> {
  // Fetch all known senders (global + org-specific)
  const senders = await db
    .select()
    .from(knownSenders)
    .where(
      or(
        eq(knownSenders.isGlobal, true),
        eq(knownSenders.organizationId, organizationId)
      )
    );

  // Check each sender's IP ranges
  for (const sender of senders) {
    const ipRanges = sender.ipRanges as string[] | null;
    if (!ipRanges || ipRanges.length === 0) {
      continue;
    }

    for (const range of ipRanges) {
      if (ipInRange(ip, range)) {
        return {
          ...sender,
          ipRanges: ipRanges,
          dkimDomains: sender.dkimDomains as string[] | null,
        };
      }
    }
  }

  return null;
}

/**
 * Match DKIM domains to known senders
 */
export async function matchSourceByDkim(
  dkimDomain: string,
  organizationId: string
): Promise<KnownSender | null> {
  // Fetch all known senders (global + org-specific)
  const senders = await db
    .select()
    .from(knownSenders)
    .where(
      or(
        eq(knownSenders.isGlobal, true),
        eq(knownSenders.organizationId, organizationId)
      )
    );

  // Check each sender's DKIM domains
  for (const sender of senders) {
    const dkimDomains = sender.dkimDomains as string[] | null;
    if (!dkimDomains || dkimDomains.length === 0) {
      continue;
    }

    if (dkimDomainMatches(dkimDomain, dkimDomains)) {
      return {
        ...sender,
        ipRanges: sender.ipRanges as string[] | null,
        dkimDomains: dkimDomains,
      };
    }
  }

  return null;
}

/**
 * Auto-match a source to known senders by IP and DKIM
 * Returns the first match found (prioritizes IP match over DKIM)
 */
export async function autoMatchSource(
  sourceId: string,
  organizationId: string
): Promise<KnownSender | null> {
  // Get the source
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) {
    return null;
  }

  // Try matching by IP
  const ipMatch = await matchSourceByIp(source.sourceIp, organizationId);
  if (ipMatch) {
    return ipMatch;
  }

  // Try matching by DKIM - get DKIM results for this source
  const dkimDomains = await db
    .select({ domain: dkimResults.domain })
    .from(dkimResults)
    .innerJoin(records, eq(dkimResults.recordId, records.id))
    .where(eq(records.sourceIp, source.sourceIp))
    .groupBy(dkimResults.domain);

  for (const { domain } of dkimDomains) {
    const dkimMatch = await matchSourceByDkim(domain, organizationId);
    if (dkimMatch) {
      return dkimMatch;
    }
  }

  return null;
}

/**
 * Batch auto-match all unmatched sources for a domain
 */
export async function autoMatchDomainSources(
  domainId: string,
  organizationId: string
): Promise<{ matched: number; total: number }> {
  // Get all unmatched sources for this domain
  const unmatchedSources = await db
    .select()
    .from(sources)
    .where(
      eq(sources.domainId, domainId)
    );

  let matched = 0;

  for (const source of unmatchedSources) {
    // Skip already matched sources
    if (source.knownSenderId) {
      continue;
    }

    const match = await autoMatchSource(source.id, organizationId);

    if (match) {
      await db
        .update(sources)
        .set({
          knownSenderId: match.id,
          updatedAt: new Date(),
        })
        .where(eq(sources.id, source.id));

      matched++;
    }
  }

  return { matched, total: unmatchedSources.length };
}

/**
 * Batch auto-match all unmatched sources for an organization
 */
export async function autoMatchOrganizationSources(
  organizationId: string
): Promise<{ matched: number; total: number }> {
  // This would be called from a background job
  // For now, we'll keep it simple and match per domain

  // Get all domains for the organization
  const { domains } = await import('@/db/schema');

  const orgDomains = await db
    .select()
    .from(domains)
    .where(eq(domains.organizationId, organizationId));

  let totalMatched = 0;
  let totalSources = 0;

  for (const domain of orgDomains) {
    const result = await autoMatchDomainSources(domain.id, organizationId);
    totalMatched += result.matched;
    totalSources += result.total;
  }

  return { matched: totalMatched, total: totalSources };
}
