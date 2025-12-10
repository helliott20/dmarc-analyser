import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(
  slug: string,
  userId: string,
  requiredRole?: string[]
) {
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

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    return NextResponse.json(membership.organization);
  } catch (error) {
    console.error('Failed to fetch organization settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      name,
      logoUrl,
      faviconUrl,
      primaryColor,
      accentColor,
      timezone,
      dataRetentionDays,
    } = body;

    // Validation
    if (name && typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Invalid name format' },
        { status: 400 }
      );
    }

    if (
      dataRetentionDays &&
      (dataRetentionDays < 30 || dataRetentionDays > 3650)
    ) {
      return NextResponse.json(
        { error: 'Data retention must be between 30 and 3650 days' },
        { status: 400 }
      );
    }

    // Validate color formats
    const hexColorRegex = /^#[0-9A-F]{6}$/i;
    if (primaryColor && !hexColorRegex.test(primaryColor)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use hex color (e.g., #3B82F6)' },
        { status: 400 }
      );
    }

    if (accentColor && !hexColorRegex.test(accentColor)) {
      return NextResponse.json(
        { error: 'Invalid accent color format. Use hex color (e.g., #10B981)' },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: Partial<typeof organizations.$inferInsert> = {};

    if (name !== undefined) updateData.name = name;
    if (logoUrl !== undefined) updateData.logoUrl = logoUrl || null;
    if (faviconUrl !== undefined) updateData.faviconUrl = faviconUrl || null;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (accentColor !== undefined) updateData.accentColor = accentColor;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (dataRetentionDays !== undefined)
      updateData.dataRetentionDays = dataRetentionDays;

    updateData.updatedAt = new Date();

    // Get old values for audit log
    const oldValues = {
      name: membership.organization.name,
      logoUrl: membership.organization.logoUrl,
      faviconUrl: membership.organization.faviconUrl,
      primaryColor: membership.organization.primaryColor,
      accentColor: membership.organization.accentColor,
      timezone: membership.organization.timezone,
      dataRetentionDays: membership.organization.dataRetentionDays,
    };

    // Update organization
    const [updatedOrg] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, membership.organization.id))
      .returning();

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'organization.settings.update',
      entityType: 'organization',
      entityId: membership.organization.id,
      oldValue: oldValues,
      newValue: updateData,
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(updatedOrg);
  } catch (error) {
    console.error('Failed to update organization settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
