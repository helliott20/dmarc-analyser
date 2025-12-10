import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import dns from 'dns/promises';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; domainId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { slug, domainId } = await params;

    // Get organization and verify membership
    const [result] = await db
      .select({
        domain: domains.domain,
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

    const domainName = result.domain;

    // Perform DNS lookups in parallel
    const [spfResult, dmarcResult] = await Promise.all([
      lookupSPF(domainName),
      lookupDMARC(domainName),
    ]);

    // DKIM requires a selector, so we'll check for common ones
    const dkimResult = await lookupDKIM(domainName);

    return NextResponse.json({
      domain: domainName,
      spf: spfResult,
      dkim: dkimResult,
      dmarc: dmarcResult,
    });
  } catch (error) {
    console.error('DNS status lookup failed:', error);
    return NextResponse.json(
      { error: 'Failed to check DNS status' },
      { status: 500 }
    );
  }
}

async function lookupSPF(domain: string): Promise<{ valid: boolean; record: string | null }> {
  try {
    const records = await dns.resolveTxt(domain);
    const flatRecords = records.flat();
    const spfRecord = flatRecords.find((r) => r.startsWith('v=spf1'));

    return {
      valid: !!spfRecord,
      record: spfRecord || null,
    };
  } catch (error) {
    return { valid: false, record: null };
  }
}

async function lookupDMARC(domain: string): Promise<{ valid: boolean; record: string | null }> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const flatRecords = records.flat();
    const dmarcRecord = flatRecords.find((r) => r.startsWith('v=DMARC1'));

    return {
      valid: !!dmarcRecord,
      record: dmarcRecord || null,
    };
  } catch (error) {
    return { valid: false, record: null };
  }
}

async function lookupDKIM(domain: string): Promise<{ valid: boolean; selectors: string[] }> {
  // Common DKIM selectors used by popular email providers
  const commonSelectors = [
    'google', 'selector1', 'selector2', 'default', 'dkim', 'mail',
    's1', 's2', 'k1', 'k2', 'mta', 'smtp', 'email',
    // Microsoft 365
    'selector1-com-onmicrosoft-com', 'selector2-com-onmicrosoft-com',
    // Google Workspace
    'google._domainkey',
    // Mailchimp
    'k1._domainkey', 'k2._domainkey', 'k3._domainkey',
    // SendGrid
    's1._domainkey', 's2._domainkey',
    // Postmark
    'pm._domainkey',
  ];

  const foundSelectors: string[] = [];

  // Check a subset of common selectors (limit to avoid too many DNS queries)
  const selectorsToCheck = commonSelectors.slice(0, 8);

  await Promise.all(
    selectorsToCheck.map(async (selector) => {
      try {
        const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
        const flatRecords = records.flat();
        const dkimRecord = flatRecords.find(
          (r) => r.startsWith('v=DKIM1') || r.includes('k=rsa') || r.includes('p=')
        );
        if (dkimRecord) {
          foundSelectors.push(selector);
        }
      } catch {
        // Selector not found, ignore
      }
    })
  );

  return {
    valid: foundSelectors.length > 0,
    selectors: foundSelectors,
  };
}
