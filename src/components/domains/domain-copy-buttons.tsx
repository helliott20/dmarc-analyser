'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DomainCopyButtonsProps {
  domain: string;
  dmarcRecord?: string | null;
  ruaEmail: string;
}

/**
 * Generate a DMARC record with the correct RUA email
 * If an existing record is provided, update it; otherwise generate a default
 */
function generateDmarcRecord(existingRecord: string | null | undefined, ruaEmail: string): string {
  const ruaValue = `mailto:${ruaEmail}`;

  if (!existingRecord) {
    // No existing record - return a sensible default
    return `v=DMARC1; p=none; rua=${ruaValue}`;
  }

  // Parse existing record and update/add rua
  const parts = existingRecord.split(';').map(p => p.trim()).filter(Boolean);
  let hasRua = false;

  const updatedParts = parts.map(part => {
    const [key] = part.split('=').map(s => s.trim().toLowerCase());
    if (key === 'rua') {
      hasRua = true;
      return `rua=${ruaValue}`;
    }
    return part;
  });

  // Add rua if it wasn't in the original record
  if (!hasRua) {
    updatedParts.push(`rua=${ruaValue}`);
  }

  return updatedParts.join('; ');
}

export function DomainCopyButtons({ domain, dmarcRecord, ruaEmail }: DomainCopyButtonsProps) {
  const [copiedType, setCopiedType] = useState<'domain' | 'dmarc' | null>(null);
  const suggestedDmarcRecord = generateDmarcRecord(dmarcRecord, ruaEmail);

  const copyToClipboard = async (text: string, type: 'domain' | 'dmarc') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="flex items-center gap-2 mt-1">
      {/* Copy domain name */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => copyToClipboard(domain, 'domain')}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
                copiedType === 'domain'
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-label="Copy domain name"
            >
              {copiedType === 'domain' ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Domain
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{domain}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Copy suggested DMARC record with RUA */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => copyToClipboard(suggestedDmarcRecord, 'dmarc')}
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
                copiedType === 'dmarc'
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              aria-label="Copy DMARC record"
            >
              {copiedType === 'dmarc' ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  DMARC Record
                </>
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <p className="font-medium">Copy DMARC Record</p>
            <p className="text-xs text-muted-foreground font-mono break-all mt-1">
              {suggestedDmarcRecord}
            </p>
            {dmarcRecord && (
              <p className="text-xs text-muted-foreground mt-2">
                Based on your current record with updated RUA
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
