'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Mail, Building2, Shield, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getRoleDisplayName, getRoleBadgeVariant, type MemberRole } from '@/lib/roles';

interface InvitationData {
  invitation: {
    email: string;
    role: MemberRole;
    expiresAt: string;
  };
  organization: {
    name: string;
    slug: string;
  };
}

interface InvitationAcceptClientProps {
  token: string;
  initialData: InvitationData | null;
  error?: string;
  isAuthenticated: boolean;
  userEmail?: string;
}

export function InvitationAcceptClient({
  token,
  initialData,
  error: initialError,
  isAuthenticated,
  userEmail,
}: InvitationAcceptClientProps) {
  const router = useRouter();
  const [isAccepting, setIsAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to accept invitation');
      }

      const data = await response.json();
      setAccepted(true);
      toast.success('Successfully joined organization!');

      // Redirect to organization after a short delay
      setTimeout(() => {
        router.push(`/orgs/${data.organization.slug}`);
      }, 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  // Error state
  if (initialError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{initialError}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">
                The invitation link may have expired or already been used. Please contact the
                organization administrator for a new invitation.
              </p>
              <Button
                onClick={() => router.push('/orgs')}
                variant="outline"
                className="w-full"
              >
                Go to My Organizations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  // Success state
  if (accepted) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-center">Welcome to the team!</CardTitle>
            <CardDescription className="text-center">
              You&apos;ve successfully joined {initialData.organization.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">
              Redirecting you to the organization...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            <CardTitle className="text-center">You&apos;ve been invited!</CardTitle>
            <CardDescription className="text-center">
              Join {initialData.organization.name} as{' '}
              {getRoleDisplayName(initialData.invitation.role).toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Organization</p>
                    <p className="text-sm text-muted-foreground">
                      {initialData.organization.name}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Role</p>
                    <div className="mt-1">
                      <Badge variant={getRoleBadgeVariant(initialData.invitation.role)}>
                        {getRoleDisplayName(initialData.invitation.role)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border p-4">
                  <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Invited Email</p>
                    <p className="text-sm text-muted-foreground">
                      {initialData.invitation.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm text-center text-muted-foreground">
                  Please sign in with the email address above to accept this invitation
                </p>
              </div>

              <Button onClick={() => router.push('/login')} className="w-full">
                Sign In to Accept
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Email mismatch state
  if (userEmail && userEmail.toLowerCase() !== initialData.invitation.email.toLowerCase()) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10">
                <XCircle className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
            <CardTitle className="text-center">Email Mismatch</CardTitle>
            <CardDescription className="text-center">
              This invitation was sent to a different email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Invitation sent to:</span>{' '}
                  {initialData.invitation.email}
                </p>
                <p className="text-sm">
                  <span className="font-medium">You are signed in as:</span> {userEmail}
                </p>
              </div>

              <p className="text-sm text-center text-muted-foreground">
                Please sign in with the correct email address or contact the organization
                administrator.
              </p>

              <Button onClick={() => router.push('/login')} className="w-full">
                Sign In with Different Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Accept invitation state
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center">You&apos;ve been invited!</CardTitle>
          <CardDescription className="text-center">
            Join {initialData.organization.name} as{' '}
            {getRoleDisplayName(initialData.invitation.role).toLowerCase()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Organization</p>
                  <p className="text-sm text-muted-foreground">
                    {initialData.organization.name}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Role</p>
                  <div className="mt-1">
                    <Badge variant={getRoleBadgeVariant(initialData.invitation.role)}>
                      {getRoleDisplayName(initialData.invitation.role)}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Expires</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(initialData.invitation.expiresAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/orgs')}
                variant="outline"
                className="flex-1"
                disabled={isAccepting}
              >
                Decline
              </Button>
              <Button
                onClick={handleAccept}
                className="flex-1"
                disabled={isAccepting}
              >
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
