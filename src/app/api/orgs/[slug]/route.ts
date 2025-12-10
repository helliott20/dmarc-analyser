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

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only owners can delete organizations
    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions. Only owners can delete organizations.' },
        { status: 404 }
      );
    }

    // Log audit event before deletion
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'organization.delete',
      entityType: 'organization',
      entityId: membership.organization.id,
      oldValue: {
        name: membership.organization.name,
        slug: membership.organization.slug,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    // Delete organization (cascade will handle related records)
    await db
      .delete(organizations)
      .where(eq(organizations.id, membership.organization.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete organization:', error);
    return NextResponse.json(
      { error: 'Failed to delete organization' },
      { status: 500 }
    );
  }
}
