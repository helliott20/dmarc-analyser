'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, Copy, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKeyDisplayProps {
  apiKey: string;
  keyName: string;
  onClose: () => void;
}

export function ApiKeyDisplay({ apiKey, keyName, onClose }: ApiKeyDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast.success('API key copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>API Key Created</DialogTitle>
        <DialogDescription>
          Your API key has been created. Make sure to copy it now as you won&apos;t be
          able to see it again.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-yellow-900 dark:text-yellow-100">
              Save this key in a secure location
            </p>
            <p className="text-yellow-800 dark:text-yellow-200">
              For security reasons, this is the only time you will be able to view
              this API key. If you lose it, you&apos;ll need to create a new one.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Key Name</label>
          <div className="p-3 bg-muted rounded-md">
            <p className="text-sm font-mono">{keyName}</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">API Key</label>
          <div className="flex gap-2">
            <div className="flex-1 p-3 bg-muted rounded-md overflow-x-auto">
              <p className="text-sm font-mono break-all">{apiKey}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="p-4 bg-muted rounded-md text-sm space-y-2">
          <p className="font-medium">Using your API key:</p>
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded border">
            {`curl -H "Authorization: Bearer ${apiKey}" \\
  https://your-domain.com/api/orgs/your-org/domains`}
          </pre>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={onClose}>I&apos;ve saved my key</Button>
      </DialogFooter>
    </>
  );
}
