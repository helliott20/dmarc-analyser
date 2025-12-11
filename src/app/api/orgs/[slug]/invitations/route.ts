import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, invitations, users, auditLogs } from '@/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { canInviteMembers, canAssignRole, generateInvitationToken, getInvitationExpiry, type MemberRole } from '@/lib/roles';
import { sendInvitationEmail } from '@/lib/email-service';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to this organization
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

    // Get all pending invitations (not accepted and not expired)
    const now = new Date();
    const pendingInvitations = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        role: invitations.role,
        token: invitations.token,
        expiresAt: invitations.expiresAt,
        acceptedAt: invitations.acceptedAt,
        createdAt: invitations.createdAt,
        invitedBy: invitations.invitedBy,
      })
      .from(invitations)
      .where(
        and(
          eq(invitations.organizationId, orgAccess.organizationId),
          or(
            isNull(invitations.acceptedAt),
            eq(invitations.acceptedAt, null as any)
          )
        )
      )
      .orderBy(invitations.createdAt);

    // Get inviter info for each invitation
    const invitationsWithInviters = await Promise.all(
      pendingInvitations.map(async (invitation) => {
        const [inviter] = await db
          .select({
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, invitation.invitedBy))
          .limit(1);

        return {
          ...invitation,
          inviter: inviter || null,
          isExpired: invitation.expiresAt < now,
        };
      })
    );

    return NextResponse.json({
      invitations: invitationsWithInviters,
    });
  } catch (error) {
    console.error('Failed to fetch invitations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, role } = await request.json();

    // Validate inputs
    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (!['owner', 'admin', 'member', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
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
        { error: 'You do not have permission to invite members' },
        { status: 403 }
      );
    }

    if (!canAssignRole(orgAccess.role as MemberRole, role as MemberRole)) {
      return NextResponse.json(
        { error: 'You cannot invite members with roles equal to or higher than your own' },
        { status: 403 }
      );
    }

    // Check if user is already a member
    const [existingUser] = await db
      .select({
        userId: users.id,
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      const [existingMember] = await db
        .select()
        .from(orgMembers)
        .where(
          and(
            eq(orgMembers.userId, existingUser.userId),
            eq(orgMembers.organizationId, orgAccess.organizationId)
          )
        )
        .limit(1);

      if (existingMember) {
        return NextResponse.json(
          { error: 'This user is already a member of the organization' },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invitation
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email.toLowerCase()),
          eq(invitations.organizationId, orgAccess.organizationId),
          isNull(invitations.acceptedAt)
        )
      )
      .limit(1);

    if (existingInvitation) {
      // Check if expired
      if (existingInvitation.expiresAt < new Date()) {
        // Delete expired invitation and create new one
        await db
          .delete(invitations)
          .where(eq(invitations.id, existingInvitation.id));
      } else {
        return NextResponse.json(
          { error: 'An invitation has already been sent to this email address' },
          { status: 400 }
        );
      }
    }

    // Generate invitation token
    const token = generateInvitationToken();
    const expiresAt = getInvitationExpiry();

    // Create invitation
    const [invitation] = await db
      .insert(invitations)
      .values({
        organizationId: orgAccess.organizationId,
        email: email.toLowerCase(),
        role,
        token,
        invitedBy: session.user.id,
        expiresAt,
      })
      .returning();

    // Create audit log
    await db.insert(auditLogs).values({
      organizationId: orgAccess.organizationId,
      userId: session.user.id,
      action: 'member.invited',
      entityType: 'invitation',
      entityId: invitation.id,
      oldValue: null,
      newValue: { email, role },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Send invitation email (non-blocking - don't fail if email fails)
    sendInvitationEmail({
      organizationId: orgAccess.organizationId,
      inviterId: session.user.id,
      recipientEmail: email.toLowerCase(),
      role,
      token,
    }).then((result) => {
      if (!result.success) {
        console.warn(`[Invitation] Failed to send email to ${email}:`, result.error);
      } else {
        console.log(`[Invitation] Email sent to ${email}`);
      }
    }).catch((error) => {
      console.error(`[Invitation] Error sending email to ${email}:`, error);
    });

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Failed to create invitation:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
