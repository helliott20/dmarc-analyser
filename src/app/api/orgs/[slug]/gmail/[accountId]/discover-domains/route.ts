import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts, domains, discoveredDomains } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { getValidAccessToken } from '@/lib/gmail';

interface RouteParams {
  params: Promise<{ slug: string; accountId: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return membership || null;
}

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
 * GET /api/orgs/[slug]/gmail/[accountId]/discover-domains
 * Scan Gmail for DMARC reports and suggest domains to add
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    // Get the Gmail account
    const [gmailAccount] = await db
      .select()
      .from(gmailAccounts)
      .where(
        and(
          eq(gmailAccounts.id, accountId),
          eq(gmailAccounts.organizationId, membership.organization.id)
        )
      );

    if (!gmailAccount) {
      return NextResponse.json(
        { error: 'Gmail account not found' },
        { status: 404 }
      );
    }

    // Get existing domains for this org
    const existingDomains = await db
      .select({ domain: domains.domain })
      .from(domains)
      .where(eq(domains.organizationId, membership.organization.id));

    const existingDomainSet = new Set(existingDomains.map(d => d.domain.toLowerCase()));

    // Get dismissed discovered domains (user chose to ignore these)
    const dismissedDomains = await db
      .select({ domain: discoveredDomains.domain })
      .from(discoveredDomains)
      .where(
        and(
          eq(discoveredDomains.organizationId, membership.organization.id),
          eq(discoveredDomains.gmailAccountId, accountId),
          isNotNull(discoveredDomains.dismissedAt)
        )
      );

    const dismissedDomainSet = new Set(dismissedDomains.map(d => d.domain.toLowerCase()));

    // Get access token
    const accessToken = await getValidAccessToken(accountId);

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
      const error = await searchResponse.text();
      console.error('Gmail search failed:', error);
      return NextResponse.json(
        { error: 'Failed to search Gmail' },
        { status: 500 }
      );
    }

    const searchData = await searchResponse.json();
    const messageIds: string[] = (searchData.messages || []).map((m: { id: string }) => m.id);

    // Extract domains from email subjects
    const discoveredDomainsMap = new Map<string, number>(); // domain -> count

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
        if (domain && !existingDomainSet.has(domain) && !dismissedDomainSet.has(domain)) {
          discoveredDomainsMap.set(domain, (discoveredDomainsMap.get(domain) || 0) + 1);
        }
      }

      // Small delay between batches
      if (i + batchSize < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sort by count (most reports first)
    const suggestions = Array.from(discoveredDomainsMap.entries())
      .map(([domain, count]) => ({ domain, reportCount: count }))
      .sort((a, b) => b.reportCount - a.reportCount);

    return NextResponse.json({
      suggestions,
      scannedEmails: Math.min(messageIds.length, 50),
      totalEmails: messageIds.length,
    });
  } catch (error) {
    console.error('Failed to discover domains:', error);
    return NextResponse.json(
      { error: 'Failed to discover domains' },
      { status: 500 }
    );
  }
}
