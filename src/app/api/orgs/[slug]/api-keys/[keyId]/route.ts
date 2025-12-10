import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, apiKeys } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ slug: string; keyId: string }>;
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

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, keyId } = await params;

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

    // Verify the key belongs to this organization
    const [existingKey] = await db
      .select()
      .from(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.organizationId, membership.organization.id)
        )
      )
      .limit(1);

    if (!existingKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 });
    }

    // Delete the API key
    await db
      .delete(apiKeys)
      .where(
        and(
          eq(apiKeys.id, keyId),
          eq(apiKeys.organizationId, membership.organization.id)
        )
      );

    // Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'api_key.delete',
      entityType: 'api_key',
      entityId: keyId,
      oldValue: {
        name: existingKey.name,
        keyPrefix: existingKey.keyPrefix,
        scopes: JSON.parse(existingKey.scopes),
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete API key:', error);
    return NextResponse.json(
      { error: 'Failed to delete API key' },
      { status: 500 }
    );
  }
}
