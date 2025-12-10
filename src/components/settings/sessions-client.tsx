'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { Loader2, Monitor, Smartphone, Tablet, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Session {
  sessionToken: string;
  expires: Date;
}

interface SessionsClientProps {
  sessions: Session[];
  currentSessionToken: string | null;
}

export function SessionsClient({ sessions, currentSessionToken }: SessionsClientProps) {
  const router = useRouter();
  const [isRevoking, setIsRevoking] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);

  const activeSessionsCount = sessions.filter(s => new Date(s.expires) > new Date()).length;
  const otherSessions = sessions.filter(
    s => s.sessionToken !== currentSessionToken && new Date(s.expires) > new Date()
  );

  async function revokeSession(sessionToken: string) {
    setIsRevoking(sessionToken);

    try {
      const response = await fetch('/api/user/sessions', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke session');
      }

      toast.success('Session revoked successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke session');
    } finally {
      setIsRevoking(null);
    }
  }

  async function revokeAllOtherSessions() {
    setIsRevokingAll(true);

    try {
      const response = await fetch('/api/user/sessions/revoke-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to revoke sessions');
      }

      toast.success('All other sessions revoked successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke sessions');
    } finally {
      setIsRevokingAll(false);
    }
  }

  // Mock function to get device type from user agent (in real implementation, this would be parsed from session metadata)
  function getDeviceIcon() {
    // In a real implementation, you would store user agent in session metadata
    // For now, we'll use a generic monitor icon
    return Monitor;
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-sm font-medium">
            {activeSessionsCount} active {activeSessionsCount === 1 ? 'session' : 'sessions'}
          </span>
        </div>
        {otherSessions.length > 0 && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={isRevokingAll}>
                {isRevokingAll && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Revoke All Other Sessions
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will sign you out from all devices except this one. You will need to sign in
                  again on those devices.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={revokeAllOtherSessions}>
                  Revoke All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Current Session */}
      {sessions.map((session) => {
        const isCurrent = session.sessionToken === currentSessionToken;
        const isExpired = new Date(session.expires) < new Date();

        if (!isCurrent && isExpired) return null;

        const DeviceIcon = getDeviceIcon();

        return (
          <Card key={session.sessionToken}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <DeviceIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {isCurrent ? 'This Device' : 'Other Device'}
                    </CardTitle>
                    <CardDescription>
                      {isExpired ? 'Expired' : `Expires ${formatDistanceToNow(new Date(session.expires), { addSuffix: true })}`}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCurrent && <Badge variant="secondary">Current</Badge>}
                  {isExpired && <Badge variant="destructive">Expired</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {/* In a real implementation, you would show actual device/location info */}
                <div className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Browser</span>
                    <span className="font-medium">Unknown</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Address</span>
                    <span className="font-medium">Not tracked</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">Not tracked</span>
                  </div>
                </div>

                {!isCurrent && !isExpired && (
                  <div className="pt-2">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          disabled={isRevoking === session.sessionToken}
                        >
                          {isRevoking === session.sessionToken && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Revoke Session
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will sign you out from this device. You will need to sign in again
                            to access your account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => revokeSession(session.sessionToken)}>
                            Revoke
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {activeSessionsCount === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No active sessions</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don&apos;t have any active sessions at the moment.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Session Tracking
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                This is a basic session view. In production, additional metadata like device type,
                browser, IP address, and location would be tracked for better security monitoring.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
