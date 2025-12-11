import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, invitations, auditLogs } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canInviteMembers, generateInvitationToken, getInvitationExpiry, type MemberRole } from '@/lib/roles';
import { sendInvitationEmail } from '@/lib/email-service';

export async function POST(
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

    // Check permissions
    if (!canInviteMembers(orgAccess.role as MemberRole)) {
      return NextResponse.json(
        { error: 'You do not have permission to resend invitations' },
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
        { error: 'Cannot resend an already accepted invitation' },
        { status: 400 }
      );
    }

    // Generate new token and expiration
    const token = generateInvitationToken();
    const expiresAt = getInvitationExpiry();

    // Update invitation with new token and expiration
    const [updatedInvitation] = await db
      .update(invitations)
      .set({
        token,
        expiresAt,
        invitedBy: session.user.id, // Update inviter to current user
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      organizationId: orgAccess.organizationId,
      userId: session.user.id,
      action: 'invitation.resent',
      entityType: 'invitation',
      entityId: invitation.id,
      oldValue: { token: invitation.token, expiresAt: invitation.expiresAt },
      newValue: { token, expiresAt },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Send invitation email (non-blocking - don't fail if email fails)
    sendInvitationEmail({
      organizationId: orgAccess.organizationId,
      inviterId: session.user.id,
      recipientEmail: updatedInvitation.email,
      role: updatedInvitation.role,
      token,
    }).then((result) => {
      if (!result.success) {
        console.warn(`[Invitation] Failed to resend email to ${updatedInvitation.email}:`, result.error);
      } else {
        console.log(`[Invitation] Resent email to ${updatedInvitation.email}`);
      }
    }).catch((error) => {
      console.error(`[Invitation] Error resending email to ${updatedInvitation.email}:`, error);
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: updatedInvitation.id,
        email: updatedInvitation.email,
        role: updatedInvitation.role,
        expiresAt: updatedInvitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to resend invitation:', error);
    return NextResponse.json(
      { error: 'Failed to resend invitation' },
      { status: 500 }
    );
  }
}
