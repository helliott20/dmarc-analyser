'use client';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface VolumeBarProps {
  volumePercent: number;
  totalMessages: number;
  passedMessages: number;
  failedMessages: number;
  passRate: number;
  className?: string;
}

export function VolumeBar({
  volumePercent,
  totalMessages,
  passedMessages,
  failedMessages,
  passRate,
  className,
}: VolumeBarProps) {
  // Calculate the width of passed vs failed segments
  const passedPercent = totalMessages > 0 ? (passedMessages / totalMessages) * 100 : 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-3', className)}>
            {/* Volume bar container */}
            <div className="relative h-3 w-32 rounded-full bg-muted overflow-hidden">
              {/* Background bar representing total volume */}
              <div
                className="absolute inset-y-0 left-0 rounded-full overflow-hidden flex"
                style={{ width: `${Math.max(volumePercent, 2)}%` }}
              >
                {totalMessages > 0 ? (
                <>
                  {/* Passed segment (green) */}
                  <div
                    className="h-full bg-success transition-all duration-300"
                    style={{ width: `${passedPercent}%` }}
                  />
                  {/* Failed segment (red) */}
                  <div
                    className="h-full bg-destructive transition-all duration-300"
                    style={{ width: `${100 - passedPercent}%` }}
                  />
                </>
              ) : (
                /* Empty state - gray bar */
                <div className="h-full w-full bg-muted-foreground/20" />
              )}
              </div>
            </div>
            {/* Message count */}
            <span className="text-sm text-muted-foreground tabular-nums min-w-[4ch] text-right">
              {totalMessages.toLocaleString()}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1 text-xs">
            <p className="font-medium">7-Day Volume</p>
            <div className="flex justify-between gap-4">
              <span>Total:</span>
              <span className="tabular-nums">{totalMessages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-success">
              <span>Passed:</span>
              <span className="tabular-nums">{passedMessages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 text-destructive">
              <span>Failed:</span>
              <span className="tabular-nums">{failedMessages.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-4 pt-1 border-t">
              <span>Pass Rate:</span>
              <span className="tabular-nums font-medium">{passRate}%</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
