import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import dns from 'dns/promises';

interface RouteParams {
  params: Promise<{ slug: string; domainId: string }>;
}

async function getDomainWithAccess(
  domainId: string,
  orgSlug: string,
  userId: string,
  requiredRoles?: string[]
) {
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
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  if (!result) return null;

  if (requiredRoles && !requiredRoles.includes(result.role)) {
    return null;
  }

  return result;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, domainId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await getDomainWithAccess(domainId, slug, session.user.id, [
      'owner',
      'admin',
      'member',
    ]);

    if (!result) {
      return NextResponse.json(
        { error: 'Domain not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { domain } = result;

    if (domain.verifiedAt) {
      return NextResponse.json(
        { error: 'Domain is already verified' },
        { status: 400 }
      );
    }

    if (!domain.verificationToken) {
      return NextResponse.json(
        { error: 'No verification token found' },
        { status: 400 }
      );
    }

    // Perform DNS TXT lookup
    const verificationHost = `_dmarc-verify.${domain.domain}`;

    try {
      const records = await dns.resolveTxt(verificationHost);
      const flatRecords = records.flat();

      const found = flatRecords.some(
        (record) => record === domain.verificationToken
      );

      if (!found) {
        return NextResponse.json(
          {
            error: `Verification failed. Expected TXT record "${domain.verificationToken}" at ${verificationHost} but found: ${flatRecords.length > 0 ? flatRecords.join(', ') : 'no records'}`,
          },
          { status: 400 }
        );
      }

      // Update domain as verified
      await db
        .update(domains)
        .set({
          verifiedAt: new Date(),
          verifiedBy: session.user.id,
          updatedAt: new Date(),
        })
        .where(eq(domains.id, domainId));

      // Also try to fetch the DMARC record
      try {
        const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain.domain}`);
        const dmarcRecord = dmarcRecords.flat().find((r) => r.startsWith('v=DMARC1'));

        if (dmarcRecord) {
          await db
            .update(domains)
            .set({
              dmarcRecord,
              lastDnsCheck: new Date(),
            })
            .where(eq(domains.id, domainId));
        }
      } catch {
        // Ignore DMARC record fetch errors
      }

      return NextResponse.json({ success: true });
    } catch (dnsError) {
      if ((dnsError as NodeJS.ErrnoException).code === 'ENOTFOUND' ||
          (dnsError as NodeJS.ErrnoException).code === 'ENODATA') {
        return NextResponse.json(
          {
            error: `No TXT record found at ${verificationHost}. Please add the DNS record and try again.`,
          },
          { status: 400 }
        );
      }
      throw dnsError;
    }
  } catch (error) {
    console.error('Domain verification failed:', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
