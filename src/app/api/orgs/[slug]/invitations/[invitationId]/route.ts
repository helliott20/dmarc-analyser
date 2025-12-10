import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, invitations, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canInviteMembers, type MemberRole } from '@/lib/roles';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string; invitationId: string }> }
) {
  try {
    const session = await auth();
    const { slug, invitationId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user's role in the organization
    const [orgAccess] = await db
      .select({
        organizationId: organizations.id,
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

    // Check permissions
    if (!canInviteMembers(orgAccess.role as MemberRole)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage invitations' },
        { status: 403 }
      );
    }

    // Get invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.id, invitationId),
          eq(invitations.organizationId, orgAccess.organizationId)
        )
      )
      .limit(1);

    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    // Check if invitation is already accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Cannot cancel an already accepted invitation' },
        { status: 400 }
      );
    }

    // Delete invitation
    await db
      .delete(invitations)
      .where(eq(invitations.id, invitationId));

    // Create audit log
    await db.insert(auditLogs).values({
      organizationId: orgAccess.organizationId,
      userId: session.user.id,
      action: 'invitation.cancelled',
      entityType: 'invitation',
      entityId: invitation.id,
      oldValue: { email: invitation.email, role: invitation.role },
      newValue: null,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to cancel invitation:', error);
    return NextResponse.json(
      { error: 'Failed to cancel invitation' },
      { status: 500 }
    );
  }
}
