import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import dns from 'dns/promises';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

async function lookupSPF(domain: string): Promise<string | null> {
  try {
    const records = await dns.resolveTxt(domain);
    const flatRecords = records.flat();
    return flatRecords.find((r) => r.startsWith('v=spf1')) || null;
  } catch {
    return null;
  }
}

async function lookupDMARC(domain: string): Promise<string | null> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${domain}`);
    const flatRecords = records.flat();
    return flatRecords.find((r) => r.startsWith('v=DMARC1')) || null;
  } catch {
    return null;
  }
}

/**
 * POST /api/orgs/[slug]/domains/[domainId]/dns-refresh
 * Force refresh DNS records and update cached values in database
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
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

    const domainName = result.domain.domain;
    const previousDmarc = result.domain.dmarcRecord;
    const previousSpf = result.domain.spfRecord;

    // Fetch fresh DNS records
    const [dmarcRecord, spfRecord] = await Promise.all([
      lookupDMARC(domainName),
      lookupSPF(domainName),
    ]);

    // Check for changes
    const dmarcChanged = previousDmarc !== dmarcRecord;
    const spfChanged = previousSpf !== spfRecord;

    // Update database with new records
    await db
      .update(domains)
      .set({
        dmarcRecord: dmarcRecord,
        spfRecord: spfRecord,
        lastDnsCheck: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(domains.id, domainId));

    return NextResponse.json({
      domain: domainName,
      dmarc: {
        record: dmarcRecord,
        valid: !!dmarcRecord,
        changed: dmarcChanged,
        previous: previousDmarc,
      },
      spf: {
        record: spfRecord,
        valid: !!spfRecord,
        changed: spfChanged,
        previous: previousSpf,
      },
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DNS refresh failed:', error);
    return NextResponse.json(
      { error: 'Failed to refresh DNS records' },
      { status: 500 }
    );
  }
}
