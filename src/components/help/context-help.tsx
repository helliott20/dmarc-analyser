import * as React from 'react';
import { HelpCircle } from 'lucide-react';
import Link from 'next/link';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface ContextHelpProps {
  article?: string;
  title?: string;
  description?: string;
  href?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ContextHelp({
  article,
  title = 'Learn more',
  description,
  href,
  className,
  size = 'sm',
}: ContextHelpProps) {
  const link = href || (article ? `/help#${article}` : '/help');

  const iconSizeClass = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }[size];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={link}
            className={cn(
              'inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors',
              className
            )}
            aria-label={title}
          >
            <HelpCircle className={iconSizeClass} />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium text-sm">{title}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ContextHelpCardProps {
  title: string;
  description: string;
  href: string;
  className?: string;
}

export function ContextHelpCard({
  title,
  description,
  href,
  className,
}: ContextHelpCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'block rounded-lg border bg-card p-4 hover:bg-accent hover:shadow-sm transition-all',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
          <HelpCircle className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-medium text-sm leading-none">{title}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
