'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  StopCircle,
  ChevronDown,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';

interface SyncProgressData {
  imported: number;
  skipped: number;
  errors: number;
  batchesProcessed: number;
}

interface GmailAccount {
  id: string;
  email: string;
  syncEnabled: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  syncStatus?: string | null;
  syncProgress?: SyncProgressData | unknown | null;
}

interface GmailAccountCardProps {
  account: GmailAccount;
  orgSlug: string;
  canManage: boolean;
}

interface SyncProgress {
  imported: number;
  skipped: number;
  errors: number;
  batchesProcessed: number;
  totalProcessed: number;
  startTime: number;
}

export function GmailAccountCard({
  account,
  orgSlug,
  canManage,
}: GmailAccountCardProps) {
  const router = useRouter();
  const [isSyncing, setIsSyncing] = useState(account.syncStatus === 'syncing');
  const stopRef = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(account.syncEnabled);
  // Only initialize syncProgress if actively syncing - avoid stale data from database
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(
    account.syncStatus === 'syncing' ? (account.syncProgress as SyncProgress | null) : null
  );

  // Track elapsed time for display
  const [elapsedTime, setElapsedTime] = useState(0);

  // Poll for sync progress if syncing
  useEffect(() => {
    if (!isSyncing) return;

    const pollInterval = setInterval(() => {
      router.refresh();
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [isSyncing, router]);

  // Update elapsed time every second while syncing
  useEffect(() => {
    if (!isSyncing || !syncProgress?.startTime) {
      setElapsedTime(0);
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime(Math.round((Date.now() - syncProgress.startTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isSyncing, syncProgress?.startTime]);

  // Update state when account prop changes (from polling)
  useEffect(() => {
    const isCurrentlySyncing = account.syncStatus === 'syncing';
    setIsSyncing(isCurrentlySyncing);

    // Only update syncProgress if actively syncing, otherwise clear it
    if (isCurrentlySyncing && account.syncProgress) {
      setSyncProgress(account.syncProgress as SyncProgress);
    } else if (!isCurrentlySyncing) {
      setSyncProgress(null);
    }
  }, [account.syncStatus, account.syncProgress]);

  const handleStop = async () => {
    stopRef.current = true;
    toast.info('Stopping sync...');

    // Also reset server-side sync status
    try {
      await fetch(`/api/orgs/${orgSlug}/gmail/${account.id}/sync/cancel`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to cancel sync:', error);
    }

    setIsSyncing(false);
    setSyncProgress(null);
    router.refresh();
  };

  const handleSync = useCallback(async (searchAll = false) => {
    setIsSyncing(true);
    stopRef.current = false;
    const startTime = Date.now();
    setSyncProgress({
      imported: 0,
      skipped: 0,
      errors: 0,
      batchesProcessed: 0,
      totalProcessed: 0,
      startTime,
    });

    let pageToken: string | undefined;
    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let batchesProcessed = 0;
    let totalProcessed = 0;

    try {
      do {
        // Check stop flag before each batch
        if (stopRef.current) {
          toast.info(`Sync stopped: ${totalImported} imported so far`);
          break;
        }

        const response = await fetch(
          `/api/orgs/${orgSlug}/gmail/${account.id}/sync`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pageToken, searchAll }),
          }
        );

        if (!response.ok) {
          throw new Error('Sync failed');
        }

        const data = await response.json();
        totalImported += data.imported;
        totalSkipped += data.skipped;
        totalErrors += data.errors;
        totalProcessed += data.total || 0;
        batchesProcessed++;

        setSyncProgress({
          imported: totalImported,
          skipped: totalSkipped,
          errors: totalErrors,
          batchesProcessed,
          totalProcessed,
          startTime,
        });

        pageToken = data.nextPageToken;

        if (!data.hasMore) break;
      } while (pageToken && !stopRef.current);

      if (!stopRef.current) {
        toast.success(`Sync complete: ${totalImported} imported, ${totalSkipped} skipped, ${totalErrors} errors`);
      }
      router.refresh();
    } catch (error) {
      toast.error('Failed to sync Gmail account');
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
      stopRef.current = false;
    }
  }, [account.id, orgSlug, router]);

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
      toast.success(enabled ? 'Sync enabled' : 'Sync disabled');
    } catch (error) {
      toast.error('Failed to update sync settings');
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
    } catch (error) {
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
              {account.lastSyncAt ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span>Last sync: {formatLastSync(account.lastSyncAt)}</span>
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" />
                  <span>Never synced</span>
                </>
              )}
            </div>
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
                  onClick={handleStop}
                  className="text-red-600 border-red-200 hover:bg-red-50 min-w-[70px]"
                >
                  <StopCircle className="h-4 w-4 mr-1" />
                  Stop
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="min-w-[70px]">
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Sync
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleSync(false)}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Sync Inbox
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSync(true)}>
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

      {/* Sync Progress - only shown when actively syncing */}
      {isSyncing && syncProgress && (
        <div className="mt-3 pt-3 border-t space-y-3">
          {/* Progress header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Processing emails...
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {syncProgress.totalProcessed > 0 && (
                <>
                  {syncProgress.totalProcessed} emails scanned
                </>
              )}
              {elapsedTime > 0 && (
                <> · {elapsedTime < 60 ? `${elapsedTime}s` : `${Math.floor(elapsedTime / 60)}m ${elapsedTime % 60}s`}</>
              )}
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md bg-green-50 dark:bg-green-950/30 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {syncProgress.imported}
              </div>
              <div className="text-xs text-green-600/70 dark:text-green-400/70">Imported</div>
            </div>
            <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                {syncProgress.skipped}
              </div>
              <div className="text-xs text-yellow-600/70 dark:text-yellow-400/70">Skipped</div>
            </div>
            <div className="rounded-md bg-red-50 dark:bg-red-950/30 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                {syncProgress.errors}
              </div>
              <div className="text-xs text-red-600/70 dark:text-red-400/70">Errors</div>
            </div>
          </div>

          {/* Batch indicator */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${Math.min((syncProgress.batchesProcessed % 10) * 10 + 10, 100)}%` }}
              />
            </div>
            <span>Batch {syncProgress.batchesProcessed}</span>
          </div>
        </div>
      )}
    </div>
  );
}
