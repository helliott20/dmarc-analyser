'use client';

import { useEffect, useState } from 'react';
import { Users, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TeamMembersList } from './team-members-list';
import { PendingInvitationsList } from './pending-invitations-list';
import { InviteMemberForm } from './invite-member-form';
import { type MemberRole } from '@/lib/roles';

interface TeamMember {
  id: string;
  userId: string;
  role: MemberRole;
  joinedAt: Date;
  invitedBy: string | null;
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  inviter: {
    name: string | null;
    email: string;
  } | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: MemberRole;
  expiresAt: Date;
  createdAt: Date;
  isExpired: boolean;
  inviter: {
    name: string | null;
    email: string;
  } | null;
}

interface TeamManagementClientProps {
  orgSlug: string;
  currentUserId: string;
  currentUserRole: MemberRole;
  canManage: boolean;
  assignableRoles: MemberRole[];
  initialMembers: TeamMember[];
  initialInvitations: PendingInvitation[];
}

export function TeamManagementClient({
  orgSlug,
  currentUserId,
  currentUserRole,
  canManage,
  assignableRoles,
  initialMembers,
  initialInvitations,
}: TeamManagementClientProps) {
  const [members, setMembers] = useState<TeamMember[]>(initialMembers);
  const [invitations, setInvitations] = useState<PendingInvitation[]>(initialInvitations);
  const [activeTab, setActiveTab] = useState('members');

  const fetchMembers = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const fetchInvitations = async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/invitations`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations);
      }
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
    }
  };

  const handleMemberUpdated = () => {
    fetchMembers();
  };

  const handleInvitationUpdated = () => {
    fetchInvitations();
  };

  const handleInvitationSent = () => {
    fetchInvitations();
    setActiveTab('invitations');
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <InviteMemberForm
          orgSlug={orgSlug}
          assignableRoles={assignableRoles}
          onInvitationSent={handleInvitationSent}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your organization members and pending invitations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full max-w-md grid-cols-2">
              <TabsTrigger value="members" className="gap-2">
                <Users className="h-4 w-4" />
                Members ({members.length})
              </TabsTrigger>
              <TabsTrigger value="invitations" className="gap-2">
                <Mail className="h-4 w-4" />
                Pending ({invitations.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-6">
              <TeamMembersList
                orgSlug={orgSlug}
                members={members}
                currentUserId={currentUserId}
                currentUserRole={currentUserRole}
                canManage={canManage}
                assignableRoles={assignableRoles}
                onMemberUpdated={handleMemberUpdated}
              />
            </TabsContent>

            <TabsContent value="invitations" className="mt-6">
              <PendingInvitationsList
                orgSlug={orgSlug}
                invitations={invitations}
                canManage={canManage}
                onInvitationUpdated={handleInvitationUpdated}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
