'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2 } from 'lucide-react';

interface GmailConnectButtonProps {
  orgSlug: string;
  orgId: string;
}

export function GmailConnectButton({ orgSlug, orgId }: GmailConnectButtonProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      // Get the OAuth URL from the API
      const response = await fetch(`/api/orgs/${orgSlug}/gmail/auth-url`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orgId }),
      });

      if (!response.ok) {
        throw new Error('Failed to get auth URL');
      }

      const { url } = await response.json();

      // Redirect to Google OAuth
      window.location.href = url;
    } catch (error) {
      console.error('Failed to connect Gmail:', error);
      setIsConnecting(false);
    }
  };

  return (
    <Button onClick={handleConnect} disabled={isConnecting}>
      {isConnecting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Mail className="h-4 w-4 mr-2" />
      )}
      Connect Gmail
    </Button>
  );
}
