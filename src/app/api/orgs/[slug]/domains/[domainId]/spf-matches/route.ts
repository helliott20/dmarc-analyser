import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains, knownSenders } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

interface KnownSender {
  id: string;
  name: string;
  category: string;
  logoUrl: string | null;
  website: string | null;
  spfInclude: string | null;
  ipRanges: string[] | null;
}

/**
 * Parse an IP address into its numeric components
 */
function parseIP(ip: string): number[] | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  const nums = parts.map(p => parseInt(p, 10));
  if (nums.some(n => isNaN(n) || n < 0 || n > 255)) return null;

  return nums;
}

/**
 * Convert IP address to a single number for comparison
 */
function ipToNumber(ip: string): number | null {
  const parts = parseIP(ip);
  if (!parts) return null;

  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

/**
 * Check if an IP address falls within a CIDR range
 */
function ipInRange(ip: string, cidr: string): boolean {
  // Handle CIDR notation
  const [rangeIp, prefixStr] = cidr.split('/');
  const prefix = prefixStr ? parseInt(prefixStr, 10) : 32;

  if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;

  const ipNum = ipToNumber(ip);
  const rangeNum = ipToNumber(rangeIp);

  if (ipNum === null || rangeNum === null) return false;

  // Create mask
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (rangeNum & mask);
}

/**
 * Check if an IP matches any of the given CIDR ranges
 */
function ipMatchesAnyRange(ip: string, ranges: string[]): boolean {
  for (const range of ranges) {
    if (ipInRange(ip, range)) {
      return true;
    }
  }
  return false;
}

/**
 * GET /api/orgs/[slug]/domains/[domainId]/spf-matches
 * Match SPF includes and IPs with known senders
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug, domainId } = await params;

    // Get domain and verify membership
    const [result] = await db
      .select({
        domain: domains,
        organization: organizations,
        role: orgMembers.role,
      })
      .from(domains)
      .innerJoin(organizations, eq(domains.organizationId, organizations.id))
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(domains.id, domainId),
          eq(organizations.slug, slug),
          eq(orgMembers.userId, session.user.id)
        )
      );

    if (!result) {
      return NextResponse.json({ error: 'Domain not found' }, { status: 404 });
    }

    const spfRecord = result.domain.spfRecord;
    if (!spfRecord) {
      return NextResponse.json({ matches: [] });
    }

    // Extract includes and IPs from SPF record
    const includeMatches = spfRecord.match(/include:([^\s]+)/gi) || [];
    const includes = includeMatches.map((m) => m.replace(/^include:/i, '').toLowerCase());

    const ip4Matches = spfRecord.match(/ip4:([^\s]+)/gi) || [];
    const ip4s = ip4Matches.map((m) => m.replace(/^ip4:/i, ''));

    const ip6Matches = spfRecord.match(/ip6:([^\s]+)/gi) || [];
    const ip6s = ip6Matches.map((m) => m.replace(/^ip6:/i, ''));

    // Get all known senders (global + org-specific)
    const senders = await db
      .select({
        id: knownSenders.id,
        name: knownSenders.name,
        category: knownSenders.category,
        logoUrl: knownSenders.logoUrl,
        website: knownSenders.website,
        spfInclude: knownSenders.spfInclude,
        ipRanges: knownSenders.ipRanges,
      })
      .from(knownSenders)
      .where(
        or(
          eq(knownSenders.isGlobal, true),
          eq(knownSenders.organizationId, result.organization.id)
        )
      );

    const matches: Array<{
      type: 'include' | 'ip4' | 'ip6';
      value: string;
      sender: Omit<KnownSender, 'spfInclude' | 'ipRanges'> | null;
    }> = [];

    // Match includes with known senders
    for (const include of includes) {
      const matchingSender = senders.find((s) => {
        if (!s.spfInclude) return false;
        const senderInclude = s.spfInclude.toLowerCase();
        // Check if the include contains the sender's SPF include pattern
        return include.includes(senderInclude) || senderInclude.includes(include);
      });

      matches.push({
        type: 'include',
        value: include,
        sender: matchingSender ? {
          id: matchingSender.id,
          name: matchingSender.name,
          category: matchingSender.category,
          logoUrl: matchingSender.logoUrl,
          website: matchingSender.website,
        } : null,
      });
    }

    // Match IPv4 addresses with known senders
    for (const ip4 of ip4s) {
      // Extract just the IP (without CIDR prefix) for display, but use full for matching
      const displayIp = ip4;
      const ipForMatching = ip4.includes('/') ? ip4.split('/')[0] : ip4;

      const matchingSender = senders.find((s) => {
        if (!s.ipRanges || !Array.isArray(s.ipRanges)) return false;
        // Check if this IP falls within any of the sender's known ranges
        return ipMatchesAnyRange(ipForMatching, s.ipRanges as string[]);
      });

      matches.push({
        type: 'ip4',
        value: displayIp,
        sender: matchingSender ? {
          id: matchingSender.id,
          name: matchingSender.name,
          category: matchingSender.category,
          logoUrl: matchingSender.logoUrl,
          website: matchingSender.website,
        } : null,
      });
    }

    // Match IPv6 addresses (basic matching - just track them)
    for (const ip6 of ip6s) {
      matches.push({
        type: 'ip6',
        value: ip6,
        sender: null, // IPv6 matching is more complex, skip for now
      });
    }

    return NextResponse.json({ matches });
  } catch (error) {
    console.error('SPF matching failed:', error);
    return NextResponse.json(
      { error: 'Failed to match SPF includes' },
      { status: 500 }
    );
  }
}
