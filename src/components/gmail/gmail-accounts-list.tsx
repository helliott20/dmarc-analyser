'use client';

import { useState, useEffect, useCallback } from 'react';
import { GmailAccountCard } from './gmail-account-card';

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
  lastSyncAt: Date | null;
  createdAt: Date;
  syncStatus?: string | null;
  syncProgress?: SyncProgress | null;
}

interface GmailAccountsListProps {
  initialAccounts: GmailAccount[];
  orgSlug: string;
  canManage: boolean;
}

export function GmailAccountsList({
  initialAccounts,
  orgSlug,
  canManage,
}: GmailAccountsListProps) {
  const [accounts, setAccounts] = useState<GmailAccount[]>(initialAccounts);

  // Check if any account is syncing
  const isSyncing = accounts.some((a) => a.syncStatus === 'syncing');

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch(`/api/orgs/${orgSlug}/gmail`);
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  }, [orgSlug]);

  // Always poll - faster when syncing, slower when idle
  useEffect(() => {
    const interval = setInterval(fetchAccounts, isSyncing ? 3000 : 15000);
    return () => clearInterval(interval);
  }, [isSyncing, fetchAccounts]);

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <GmailAccountCard
          key={account.id}
          account={account}
          orgSlug={orgSlug}
          canManage={canManage}
        />
      ))}
    </div>
  );
}
