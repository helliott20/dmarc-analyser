'use client';

import { useState } from 'react';
import { ApiKeysTable } from './api-keys-table';
import { CreateApiKeyDialog } from './create-api-key-dialog';

interface ApiKeysContentProps {
  orgSlug: string;
  canManage: boolean;
}

export function ApiKeysContent({ orgSlug, canManage }: ApiKeysContentProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSuccess = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <CreateApiKeyDialog orgSlug={orgSlug} onSuccess={handleSuccess} />
        </div>
      )}
      <ApiKeysTable key={refreshKey} orgSlug={orgSlug} canManage={canManage} />
    </div>
  );
}
