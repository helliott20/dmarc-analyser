import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { randomBytes } from 'crypto';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';
import { checkBillingAccess } from '@/lib/billing';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string, requiredRole?: string[]) {
  const [membership] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  if (!membership) {
    return null;
  }

  if (requiredRole && !requiredRole.includes(membership.role)) {
    return null;
  }

  return membership;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
      'member',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { domain, displayName } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Check billing access (SaaS mode only)
    const billingAccess = await checkBillingAccess(membership.organization.id);
    if (!billingAccess.allowed) {
      const errorMessages = {
        trial_expired: 'Your trial has expired. Please subscribe to continue adding domains.',
        subscription_canceled: 'Your subscription has been canceled. Please resubscribe to continue.',
        payment_failed: 'Your payment has failed. Please update your payment method.',
      };
      return NextResponse.json(
        {
          error: errorMessages[billingAccess.reason!] || 'Billing issue detected',
          billingReason: billingAccess.reason,
        },
        { status: 402 } // Payment Required
      );
    }

    // Check if domain already exists in this org
    const existing = await db
      .select()
      .from(domains)
      .where(
        and(
          eq(domains.organizationId, membership.organization.id),
          eq(domains.domain, domain.toLowerCase())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'This domain is already added to your organization' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = `dmarc-verify-${randomBytes(16).toString('hex')}`;

    // Create domain
    const [newDomain] = await db
      .insert(domains)
      .values({
        organizationId: membership.organization.id,
        domain: domain.toLowerCase(),
        displayName: displayName || null,
        verificationToken,
        verificationMethod: 'dns_txt',
      })
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'domain.create',
      entityType: 'domain',
      entityId: newDomain.id,
      newValue: {
        domain: newDomain.domain,
        displayName: newDomain.displayName,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(newDomain);
  } catch (error) {
    console.error('Failed to create domain:', error);
    return NextResponse.json(
      { error: 'Failed to create domain' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

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

    const orgDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.organizationId, membership.organization.id))
      .orderBy(domains.domain);

    return NextResponse.json(orgDomains);
  } catch (error) {
    console.error('Failed to fetch domains:', error);
    return NextResponse.json(
      { error: 'Failed to fetch domains' },
      { status: 500 }
    );
  }
}
