'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { MoreHorizontal, Mail, X, Clock } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getRoleBadgeVariant, getRoleDisplayName, type MemberRole } from '@/lib/roles';

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

interface PendingInvitationsListProps {
  orgSlug: string;
  invitations: PendingInvitation[];
  canManage: boolean;
  onInvitationUpdated: () => void;
}

export function PendingInvitationsList({
  orgSlug,
  invitations,
  canManage,
  onInvitationUpdated,
}: PendingInvitationsListProps) {
  const [resending, setResending] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<PendingInvitation | null>(null);

  const handleResendInvitation = async (invitationId: string) => {
    setResending(invitationId);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/invitations/${invitationId}/resend`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resend invitation');
      }

      toast.success('Invitation resent successfully');
      onInvitationUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to resend invitation');
    } finally {
      setResending(null);
    }
  };

  const handleCancelInvitation = async (invitation: PendingInvitation) => {
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/invitations/${invitation.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to cancel invitation');
      }

      toast.success('Invitation cancelled');
      onInvitationUpdated();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel invitation');
    } finally {
      setCancelling(null);
    }
  };

  if (invitations.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        No pending invitations
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Invited By</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.map((invitation) => (
              <TableRow key={invitation.id}>
                <TableCell className="font-medium">{invitation.email}</TableCell>
                <TableCell>
                  <Badge variant={getRoleBadgeVariant(invitation.role)}>
                    {getRoleDisplayName(invitation.role)}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {invitation.inviter ? (
                    <span>{invitation.inviter.name || invitation.inviter.email}</span>
                  ) : (
                    <span className="text-muted-foreground/50">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(invitation.expiresAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  {invitation.isExpired ? (
                    <Badge variant="destructive" className="gap-1">
                      <Clock className="h-3 w-3" />
                      Expired
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Mail className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {canManage && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleResendInvitation(invitation.id)}
                          disabled={resending === invitation.id}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          {resending === invitation.id ? 'Resending...' : 'Resend invitation'}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setCancelling(invitation)}
                          className="text-destructive focus:text-destructive"
                        >
                          <X className="mr-2 h-4 w-4" />
                          Cancel invitation
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Cancel Invitation Confirmation Dialog */}
      <AlertDialog
        open={cancelling !== null}
        onOpenChange={(open) => !open && setCancelling(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <strong>{cancelling?.email}</strong>? They will no longer be able to use this
              invitation link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => cancelling && handleCancelInvitation(cancelling)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, cancel invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
