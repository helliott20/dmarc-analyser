import { db } from '@/db';
import { domains, organizations, orgMembers, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getValidAccessToken } from '@/lib/gmail';

interface GmailMessageHeader {
  name: string;
  value: string;
}

interface GmailMessage {
  id: string;
  payload: {
    headers: GmailMessageHeader[];
  };
}

export interface DomainSuggestion {
  domain: string;
  reportCount: number;
}

export interface DiscoverDomainsResult {
  suggestions: DomainSuggestion[];
  scannedEmails: number;
  totalEmails: number;
}

// Extract domain from DMARC report email subject
// Typical formats:
// - "Report domain: example.com Submitter: google.com"
// - "DMARC Aggregate Report for example.com"
// - "[DMARC Report] example.com"
function extractDomainFromSubject(subject: string): string | null {
  // Pattern 1: "Report domain: example.com"
  const reportDomainMatch = subject.match(/Report\s+domain:\s*([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/i);
  if (reportDomainMatch) {
    return reportDomainMatch[1].toLowerCase();
  }

  // Pattern 2: "for example.com" or "about example.com"
  const forDomainMatch = subject.match(/(?:for|about)\s+([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,})/i);
  if (forDomainMatch) {
    return forDomainMatch[1].toLowerCase();
  }

  // Pattern 3: Look for domain-like patterns in brackets
  const bracketMatch = subject.match(/\[.*?([a-zA-Z0-9][a-zA-Z0-9.-]*\.[a-zA-Z]{2,}).*?\]/i);
  if (bracketMatch) {
    return bracketMatch[1].toLowerCase();
  }

  // Pattern 4: Generic domain extraction (last resort)
  // Look for something that looks like a domain but exclude common email providers
  const domainPattern = /\b([a-zA-Z0-9][a-zA-Z0-9-]*(?:\.[a-zA-Z0-9][a-zA-Z0-9-]*)+\.[a-zA-Z]{2,})\b/g;
  const matches = [...subject.matchAll(domainPattern)];

  // Filter out common email service domains (these are submitters, not report domains)
  const excludedDomains = ['google.com', 'yahoo.com', 'microsoft.com', 'outlook.com', 'hotmail.com', 'protection.outlook.com'];

  for (const match of matches) {
    const domain = match[1].toLowerCase();
    if (!excludedDomains.some(excluded => domain.includes(excluded))) {
      return domain;
    }
  }

  return null;
}

/**
 * Discover domains from Gmail DMARC reports that aren't already added
 */
export async function discoverDomainsFromGmail(
  gmailAccountId: string,
  organizationId: string
): Promise<DiscoverDomainsResult> {
  // Get existing domains for this org
  const existingDomains = await db
    .select({ domain: domains.domain })
    .from(domains)
    .where(eq(domains.organizationId, organizationId));

  const existingDomainSet = new Set(existingDomains.map(d => d.domain.toLowerCase()));

  // Get access token
  const accessToken = await getValidAccessToken(gmailAccountId);

  // Search for DMARC emails (broad search)
  const query = 'has:attachment (subject:dmarc OR subject:"report domain" OR from:noreply-dmarc)';

  const searchParams = new URLSearchParams({
    q: query,
    maxResults: '100',
  });

  const searchResponse = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?${searchParams}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchResponse.ok) {
    console.error('[Domain Discovery] Gmail search failed:', await searchResponse.text());
    return { suggestions: [], scannedEmails: 0, totalEmails: 0 };
  }

  const searchData = await searchResponse.json();
  const messageIds: string[] = (searchData.messages || []).map((m: { id: string }) => m.id);

  // Extract domains from email subjects
  const discoveredDomains = new Map<string, number>(); // domain -> count

  // Process messages in batches to avoid rate limits
  const batchSize = 10;
  for (let i = 0; i < Math.min(messageIds.length, 50); i += batchSize) {
    const batch = messageIds.slice(i, i + batchSize);

    const messagePromises = batch.map(async (messageId) => {
      try {
        const msgResponse = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Subject`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        if (!msgResponse.ok) return null;

        const message: GmailMessage = await msgResponse.json();
        const subjectHeader = message.payload.headers.find(h => h.name.toLowerCase() === 'subject');

        if (subjectHeader) {
          return extractDomainFromSubject(subjectHeader.value);
        }
        return null;
      } catch {
        return null;
      }
    });

    const results = await Promise.all(messagePromises);

    for (const domain of results) {
      if (domain && !existingDomainSet.has(domain)) {
        discoveredDomains.set(domain, (discoveredDomains.get(domain) || 0) + 1);
      }
    }

    // Small delay between batches
    if (i + batchSize < messageIds.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Sort by count (most reports first)
  const suggestions = Array.from(discoveredDomains.entries())
    .map(([domain, count]) => ({ domain, reportCount: count }))
    .sort((a, b) => b.reportCount - a.reportCount);

  return {
    suggestions,
    scannedEmails: Math.min(messageIds.length, 50),
    totalEmails: messageIds.length,
  };
}

/**
 * Get admin emails for an organization (owners and admins)
 */
export async function getOrgAdminEmails(organizationId: string): Promise<string[]> {
  const admins = await db
    .select({ email: users.email })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(
      and(
        eq(orgMembers.organizationId, organizationId),
        eq(orgMembers.role, 'owner')
      )
    );

  return admins.map(a => a.email).filter((e): e is string => !!e);
}

/**
 * Get organization slug by ID
 */
export async function getOrgSlug(organizationId: string): Promise<string | null> {
  const [org] = await db
    .select({ slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.id, organizationId));

  return org?.slug || null;
}
