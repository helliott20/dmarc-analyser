import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import dns from 'dns/promises';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

// Common DKIM selectors used by major email providers
const COMMON_SELECTORS = [
  'google',        // Google Workspace
  'default',       // Common default
  'selector1',     // Microsoft 365
  'selector2',     // Microsoft 365 (backup)
  'k1',            // Mailchimp
  'dkim',          // Generic
  'mail',          // Generic
  's1',            // Generic
  's2',            // Generic
  'email',         // Generic
  'smtp',          // Generic
  'mx',            // Generic
  'zoho',          // Zoho
  'mailjet',       // Mailjet
  'postmark',      // Postmark
  'amazonses',     // AWS SES
  'sendgrid',      // SendGrid
  'mailgun',       // Mailgun
];

async function lookupDKIM(domain: string, selector: string): Promise<string | null> {
  try {
    const records = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
    const flatRecords = records.flat().join('');
    // DKIM records typically start with v=DKIM1
    if (flatRecords.includes('p=') || flatRecords.includes('v=DKIM1')) {
      return flatRecords;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * GET /api/orgs/[slug]/domains/[domainId]/dkim
 * Fetch DKIM records for common selectors
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

    // Check all common selectors in parallel
    const dkimResults = await Promise.all(
      COMMON_SELECTORS.map(async (selector) => {
        const record = await lookupDKIM(domainName, selector);
        return {
          selector,
          record,
          valid: !!record,
        };
      })
    );

    // Return all results (frontend will filter to show only valid ones)
    return NextResponse.json({
      domain: domainName,
      selectors: dkimResults,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('DKIM lookup failed:', error);
    return NextResponse.json(
      { error: 'Failed to lookup DKIM records' },
      { status: 500 }
    );
  }
}
