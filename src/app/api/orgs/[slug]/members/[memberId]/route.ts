import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canManageRole, canAssignRole, type MemberRole } from '@/lib/roles';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const session = await auth();
    const { slug, memberId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role: newRole } = await request.json();

    if (!newRole || !['owner', 'admin', 'member', 'viewer'].includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get current user's role in the organization
    const [orgAccess] = await db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(organizations.slug, slug),
          eq(orgMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!orgAccess) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get target member
    const [targetMember] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.id, memberId),
          eq(orgMembers.organizationId, orgAccess.organizationId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user is trying to change their own role
    if (targetMember.userId === session.user.id) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 403 }
      );
    }

    // Check permissions: can only manage lower roles and assign lower roles
    if (!canManageRole(orgAccess.role as MemberRole, targetMember.role as MemberRole)) {
      return NextResponse.json(
        { error: 'You cannot manage members with equal or higher roles' },
        { status: 403 }
      );
    }

    if (!canAssignRole(orgAccess.role as MemberRole, newRole as MemberRole)) {
      return NextResponse.json(
        { error: 'You cannot assign roles equal to or higher than your own' },
        { status: 403 }
      );
    }

    // Special case: transferring ownership
    if (newRole === 'owner') {
      return NextResponse.json(
        { error: 'Use the transfer ownership feature to change owners' },
        { status: 403 }
      );
    }

    const oldRole = targetMember.role;

    // Update member role
    await db
      .update(orgMembers)
      .set({ role: newRole })
      .where(eq(orgMembers.id, memberId));

    // Create audit log
    await db.insert(auditLogs).values({
      organizationId: orgAccess.organizationId,
      userId: session.user.id,
      action: 'member.role_changed',
      entityType: 'member',
      entityId: targetMember.userId,
      oldValue: { role: oldRole },
      newValue: { role: newRole },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      member: { ...targetMember, role: newRole },
    });
  } catch (error) {
    console.error('Failed to update member role:', error);
    return NextResponse.json(
      { error: 'Failed to update member role' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; memberId: string }> }
) {
  try {
    const session = await auth();
    const { slug, memberId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's role in the organization
    const [orgAccess] = await db
      .select({
        organizationId: organizations.id,
        organizationName: organizations.name,
        role: orgMembers.role,
      })
      .from(organizations)
      .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
      .where(
        and(
          eq(organizations.slug, slug),
          eq(orgMembers.userId, session.user.id)
        )
      )
      .limit(1);

    if (!orgAccess) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get target member
    const [targetMember] = await db
      .select()
      .from(orgMembers)
      .where(
        and(
          eq(orgMembers.id, memberId),
          eq(orgMembers.organizationId, orgAccess.organizationId)
        )
      )
      .limit(1);

    if (!targetMember) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Check if user is trying to remove themselves
    if (targetMember.userId === session.user.id) {
      return NextResponse.json(
        { error: 'Use the leave organization feature to remove yourself' },
        { status: 403 }
      );
    }

    // Prevent removing the owner
    if (targetMember.role === 'owner') {
      return NextResponse.json(
        { error: 'Cannot remove the organization owner. Transfer ownership first.' },
        { status: 403 }
      );
    }

    // Check permissions: can only remove members with lower roles
    if (!canManageRole(orgAccess.role as MemberRole, targetMember.role as MemberRole)) {
      return NextResponse.json(
        { error: 'You cannot remove members with equal or higher roles' },
        { status: 403 }
      );
    }

    // Remove member
    await db
      .delete(orgMembers)
      .where(eq(orgMembers.id, memberId));

    // Create audit log
    await db.insert(auditLogs).values({
      organizationId: orgAccess.organizationId,
      userId: session.user.id,
      action: 'member.removed',
      entityType: 'member',
      entityId: targetMember.userId,
      oldValue: { role: targetMember.role, userId: targetMember.userId },
      newValue: null,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to remove member:', error);
    return NextResponse.json(
      { error: 'Failed to remove member' },
      { status: 500 }
    );
  }
}
