import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

function generateVerificationToken(): string {
  return `dmarc-verify=${randomBytes(16).toString('hex')}`;
}

function isValidDomain(domain: string): boolean {
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  return domainRegex.test(domain);
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check org access
    const [orgAccess] = await db
      .select({
        organization: organizations,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(eq(organizations.slug, slug), eq(orgMembers.userId, session.user.id))
      );

    if (!orgAccess) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (!['owner', 'admin'].includes(orgAccess.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const domainList: string[] = body.domains || [];

    if (!Array.isArray(domainList) || domainList.length === 0) {
      return NextResponse.json(
        { error: 'No domains provided' },
        { status: 400 }
      );
    }

    // Limit bulk import to 100 domains at a time
    if (domainList.length > 100) {
      return NextResponse.json(
        { error: 'Maximum 100 domains per bulk import' },
        { status: 400 }
      );
    }

    const results = {
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const domainName of domainList) {
      const cleanDomain = domainName.trim().toLowerCase();

      if (!cleanDomain) {
        continue;
      }

      if (!isValidDomain(cleanDomain)) {
        results.errors.push(`Invalid domain: ${cleanDomain}`);
        continue;
      }

      // Check if domain already exists
      const [existing] = await db
        .select()
        .from(domains)
        .where(
          and(
            eq(domains.organizationId, orgAccess.organization.id),
            eq(domains.domain, cleanDomain)
          )
        )
        .limit(1);

      if (existing) {
        results.skipped++;
        continue;
      }

      // Create domain
      await db.insert(domains).values({
        organizationId: orgAccess.organization.id,
        domain: cleanDomain,
        verificationToken: generateVerificationToken(),
        verificationMethod: 'dns_txt',
      });

      results.created++;
    }

    return NextResponse.json({
      success: true,
      created: results.created,
      skipped: results.skipped,
      errors: results.errors,
      message: `Created ${results.created} domain(s), skipped ${results.skipped} existing`,
    });
  } catch (error) {
    console.error('Bulk domain import error:', error);
    return NextResponse.json(
      { error: 'Failed to import domains' },
      { status: 500 }
    );
  }
}
