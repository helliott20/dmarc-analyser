import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';
import { encryptIfConfigured } from '@/lib/encryption';

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

/**
 * POST /api/orgs/[slug]/settings/byoc
 * Update BYOC (Bring Your Own Credentials) OAuth settings
 */
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
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { enabled, clientId, clientSecret } = body;

    // Prepare update data
    const updateData: Partial<typeof organizations.$inferInsert> = {
      useCustomOauth: enabled,
      updatedAt: new Date(),
    };

    // Track changes for audit log
    const oldValues = {
      useCustomOauth: membership.organization.useCustomOauth,
      hasGoogleClientId: !!membership.organization.googleClientId,
      hasGoogleClientSecret: !!membership.organization.googleClientSecret,
    };

    // If enabling, require credentials
    if (enabled) {
      if (!clientId || !clientSecret) {
        return NextResponse.json(
          { error: 'Client ID and Client Secret are required to enable BYOC' },
          { status: 400 }
        );
      }

      // Basic validation for Google OAuth client ID format
      if (!clientId.includes('.apps.googleusercontent.com')) {
        return NextResponse.json(
          { error: 'Invalid Client ID format. It should end with .apps.googleusercontent.com' },
          { status: 400 }
        );
      }

      // Encrypt the client secret before storing
      const encryptedSecret = encryptIfConfigured(clientSecret);

      updateData.googleClientId = clientId;
      updateData.googleClientSecret = encryptedSecret;
    } else {
      // When disabling, optionally clear credentials
      // For now, keep them in case they want to re-enable later
      // To fully remove: uncomment below
      // updateData.googleClientId = null;
      // updateData.googleClientSecret = null;
    }

    // Update organization
    const [updatedOrg] = await db
      .update(organizations)
      .set(updateData)
      .where(eq(organizations.id, membership.organization.id))
      .returning({
        id: organizations.id,
        useCustomOauth: organizations.useCustomOauth,
      });

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: enabled ? 'organization.byoc.enable' : 'organization.byoc.disable',
      entityType: 'organization',
      entityId: membership.organization.id,
      oldValue: oldValues,
      newValue: {
        useCustomOauth: enabled,
        hasGoogleClientId: !!updateData.googleClientId || !!membership.organization.googleClientId,
        hasGoogleClientSecret: !!updateData.googleClientSecret || !!membership.organization.googleClientSecret,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({
      success: true,
      useCustomOauth: updatedOrg.useCustomOauth,
    });
  } catch (error) {
    console.error('Failed to update BYOC settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orgs/[slug]/settings/byoc
 * Get current BYOC status (without exposing secrets)
 */
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

    return NextResponse.json({
      useCustomOauth: membership.organization.useCustomOauth ?? false,
      hasClientId: !!membership.organization.googleClientId,
      hasClientSecret: !!membership.organization.googleClientSecret,
      // Never return actual credentials
    });
  } catch (error) {
    console.error('Failed to fetch BYOC settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}
