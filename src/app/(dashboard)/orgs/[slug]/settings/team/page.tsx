import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, invitations, users } from '@/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { Shield, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TeamManagementClient } from '@/components/team/team-management-client';
import {
  canInviteMembers,
  canChangeRoles,
  getAssignableRoles,
  type MemberRole,
} from '@/lib/roles';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return result;
}

async function getMembers(organizationId: string) {
  const members = await db
    .select({
      id: orgMembers.id,
      userId: orgMembers.userId,
      role: orgMembers.role,
      joinedAt: orgMembers.joinedAt,
      invitedBy: orgMembers.invitedBy,
      user: {
        id: users.id,
        email: users.email,
        name: users.name,
        image: users.image,
      },
    })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(eq(orgMembers.organizationId, organizationId))
    .orderBy(orgMembers.joinedAt);

  // Get inviter info
  const membersWithInviters = await Promise.all(
    members.map(async (member) => {
      if (member.invitedBy) {
        const [inviter] = await db
          .select({
            name: users.name,
            email: users.email,
          })
          .from(users)
          .where(eq(users.id, member.invitedBy))
          .limit(1);

        return {
          ...member,
          inviter: inviter || null,
        };
      }
      return {
        ...member,
        inviter: null,
      };
    })
  );

  return membersWithInviters;
}

async function getInvitations(organizationId: string) {
  const now = new Date();
  const pendingInvitations = await db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      expiresAt: invitations.expiresAt,
      createdAt: invitations.createdAt,
      invitedBy: invitations.invitedBy,
    })
    .from(invitations)
    .where(
      and(
        eq(invitations.organizationId, organizationId),
        or(isNull(invitations.acceptedAt), eq(invitations.acceptedAt, null as any))
      )
    )
    .orderBy(invitations.createdAt);

  // Get inviter info
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

  return invitationsWithInviters;
}

export default async function TeamSettingsPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getOrgAndCheckAccess(slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { organization, role } = result;
  const userRole = role as MemberRole;

  // Check if user can manage team
  const canManage = canInviteMembers(userRole) && canChangeRoles(userRole);

  // Get assignable roles
  const assignableRoles = getAssignableRoles(userRole);

  // Fetch members and invitations
  const members = await getMembers(organization.id);
  const pendingInvitations = await getInvitations(organization.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage team members and invitations for {organization.name}
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Different roles have different levels of access to your organization:
          </p>

          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Owner</h4>
                <p className="text-sm text-muted-foreground">
                  Full access to all organization settings, including billing, member
                  management, and the ability to transfer ownership or delete the organization.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Can manage team members (invite, remove, change roles), domains, settings, and
                  all organization data. Cannot change owner role or delete the organization.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Member</h4>
                <p className="text-sm text-muted-foreground">
                  Can view and manage domains, reports, and sources. Can classify sources and
                  manage known senders. Cannot manage team or organization settings.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Shield className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Viewer</h4>
                <p className="text-sm text-muted-foreground">
                  Read-only access to view domains, reports, and analytics. Cannot make any
                  changes to the organization.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Management */}
      <TeamManagementClient
        orgSlug={slug}
        currentUserId={session.user.id}
        currentUserRole={userRole}
        canManage={canManage}
        assignableRoles={assignableRoles}
        initialMembers={members}
        initialInvitations={pendingInvitations}
      />
    </div>
  );
}
