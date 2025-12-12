'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Mail,
  Trash2,
  Loader2,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronDown,
  Download,
  AlertTriangle,
  XCircle,
  Square,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncProgress {
  emailsProcessed?: number;
  reportsFound?: number;
  errors?: number;
  startedAt?: string;
  completedAt?: string;
  failedAt?: string;
  error?: string;
  lastBatchAt?: string;
}

interface GmailAccount {
  id: string;
  email: string;
  syncEnabled: boolean;
  notifyNewDomains?: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  syncStatus?: string | null;
  syncProgress?: SyncProgress | null;
}

interface GmailAccountCardProps {
  account: GmailAccount;
  orgSlug: string;
  canManage: boolean;
}

export function GmailAccountCard({
  account,
  orgSlug,
  canManage,
}: GmailAccountCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTriggeringSync, setIsTriggeringSync] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(account.syncEnabled);
  const [notifyNewDomains, setNotifyNewDomains] = useState(account.notifyNewDomains ?? true);

  const syncProgress = account.syncProgress;
  const isSyncing = account.syncStatus === 'syncing';

  const handleManualSync = async (fullSync: boolean = false) => {
    setIsTriggeringSync(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/gmail/${account.id}/sync/trigger`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullSync }),
        }
      );

      if (response.status === 409) {
        toast.info('Sync already in progress');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to trigger sync');
      }

      toast.success(fullSync ? 'Full sync started' : 'Sync started');
      router.refresh();
    } catch {
      toast.error('Failed to start sync');
    } finally {
      setIsTriggeringSync(false);
    }
  };

  const handleCancelSync = async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(
        `/api/orgs/${orgSlug}/gmail/${account.id}/sync/cancel`,
        { method: 'POST' }
      );

      if (!response.ok) {
        throw new Error('Failed to cancel sync');
      }

      toast.success('Sync cancelled');
      router.refresh();
    } catch {
      toast.error('Failed to cancel sync');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ syncEnabled: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      setSyncEnabled(enabled);
      toast.success(enabled ? 'Auto-sync enabled' : 'Auto-sync disabled');
    } catch {
      toast.error('Failed to update sync settings');
    }
  };

  const handleToggleNotify = async (enabled: boolean) => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/${account.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notifyNewDomains: enabled }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      setNotifyNewDomains(enabled);
      toast.success(enabled ? 'Domain discovery emails enabled' : 'Domain discovery emails disabled');
    } catch {
      toast.error('Failed to update notification settings');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/${account.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Gmail account disconnected');
      router.refresh();
    } catch {
      toast.error('Failed to disconnect Gmail account');
      setIsDeleting(false);
    }
  };

  const formatLastSync = (date: Date | null) => {
    if (!date) return 'Never synced';
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };


  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium">{account.email}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isSyncing ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span>
                    Syncing... {syncProgress?.emailsProcessed || 0} emails, {syncProgress?.reportsFound || 0} reports
                  </span>
                </>
              ) : syncProgress?.failedAt ? (
                <>
                  <XCircle className="h-3 w-3 text-destructive" />
                  <span>Failed {formatLastSync(new Date(syncProgress.failedAt))}</span>
                </>
              ) : account.lastSyncAt ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Last sync: {formatLastSync(account.lastSyncAt)}</span>
                  {syncProgress && (
                    <span className="text-xs">
                      ({syncProgress.reportsFound || 0} reports)
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Never synced</span>
                </>
              )}
            </div>
            {/* Show error if present */}
            {syncProgress?.error && (
              <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>{syncProgress.error}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Auto-sync</span>
                <Switch
                  checked={syncEnabled}
                  onCheckedChange={handleToggleSync}
                  disabled={isSyncing}
                />
              </div>

              {isSyncing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSync}
                  disabled={isCancelling}
                >
                  {isCancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                  <span className="ml-1">Cancel</span>
                </Button>
              ) : isTriggeringSync ? (
                <Button variant="outline" size="sm" disabled>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="ml-1">Starting...</span>
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4" />
                      <span className="ml-1">Sync</span>
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleManualSync(false)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Inbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleManualSync(true)}>
                      <Download className="h-4 w-4 mr-2" />
                      Re-process All
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isDeleting || isSyncing}>
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-red-500" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Disconnect Gmail Account?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will disconnect {account.email} from this organization.
                      Previously imported reports will not be affected.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>
                      Disconnect
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
