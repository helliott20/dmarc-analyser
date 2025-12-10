'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings,
  Shield,
  Search,
  Wrench,
  Building2,
  Plus,
  Globe,
  Server,
  FileText,
  Loader2,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { searchHelpContent } from '@/lib/help-content';

interface SearchResult {
  type: 'domain' | 'source' | 'report';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export function CommandMenu() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [loading, setLoading] = React.useState(false);
  const router = useRouter();

  // Help search results (client-side, instant)
  const helpResults = React.useMemo(() => {
    if (query.length < 2) return { articles: [], faqs: [] };
    return searchHelpContent(query);
  }, [query]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        e.stopPropagation();
        setOpen((open) => !open);
      }
    };

    // Use capture phase to intercept before Chrome
    document.addEventListener('keydown', down, { capture: true });
    return () => document.removeEventListener('keydown', down, { capture: true });
  }, []);

  // Debounced search
  React.useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();
        if (response.ok) {
          setResults(data.results || []);
        } else {
          console.error('Search API error:', data.error || 'Unknown error');
          setResults([]);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    command();
  }, []);

  const getResultIcon = (type: string) => {
    switch (type) {
      case 'domain':
        return <Globe className="mr-2 h-4 w-4" />;
      case 'source':
        return <Server className="mr-2 h-4 w-4" />;
      case 'report':
        return <FileText className="mr-2 h-4 w-4" />;
      default:
        return <Search className="mr-2 h-4 w-4" />;
    }
  };

  const hasResults = results.length > 0 || helpResults.articles.length > 0 || helpResults.faqs.length > 0;

  return (
    <>
      <Button
        variant="outline"
        className="relative h-9 w-full justify-start rounded-md text-sm text-muted-foreground sm:pr-12 md:w-64"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Search...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
        <CommandInput
          placeholder="Search domains, IPs, reports, help articles..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          {loading && (
            <div className="py-6 text-center text-sm">
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            </div>
          )}

          {!loading && query.length >= 2 && !hasResults && (
            <CommandEmpty>No results found for "{query}"</CommandEmpty>
          )}

          {!loading && results.length > 0 && (
            <>
              {results.filter(r => r.type === 'domain').length > 0 && (
                <CommandGroup heading="Domains">
                  {results
                    .filter(r => r.type === 'domain')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => runCommand(() => router.push(result.url))}
                      >
                        {getResultIcon(result.type)}
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {results.filter(r => r.type === 'source').length > 0 && (
                <CommandGroup heading="Sources">
                  {results
                    .filter(r => r.type === 'source')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => runCommand(() => router.push(result.url))}
                      >
                        {getResultIcon(result.type)}
                        <div className="flex flex-col">
                          <span className="font-mono text-sm">{result.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              {results.filter(r => r.type === 'report').length > 0 && (
                <CommandGroup heading="Reports">
                  {results
                    .filter(r => r.type === 'report')
                    .map(result => (
                      <CommandItem
                        key={result.id}
                        onSelect={() => runCommand(() => router.push(result.url))}
                      >
                        {getResultIcon(result.type)}
                        <div className="flex flex-col">
                          <span>{result.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {result.subtitle}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                </CommandGroup>
              )}

              <CommandSeparator />
            </>
          )}

          {!loading && helpResults.articles.length > 0 && (
            <>
              <CommandGroup heading="Help Articles">
                {helpResults.articles.slice(0, 5).map((article) => {
                  const Icon = article.icon;
                  return (
                    <CommandItem
                      key={article.id}
                      onSelect={() => runCommand(() => router.push(article.href))}
                    >
                      <Icon className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span>{article.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {article.description}
                        </span>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>

              {helpResults.faqs.length > 0 && (
                <CommandGroup heading="Common Questions">
                  {helpResults.faqs.map((faq) => (
                    <CommandItem
                      key={faq.id}
                      onSelect={() =>
                        runCommand(() => router.push(`/help#faq-${faq.id}`))
                      }
                    >
                      <HelpCircle className="mr-2 h-4 w-4" />
                      <div className="flex flex-col">
                        <span className="text-sm">{faq.question}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              <CommandSeparator />
            </>
          )}

          {query.length < 2 && (
            <>
              <CommandGroup heading="Quick Actions">
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/orgs/new'))}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Organization
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/orgs'))}
                >
                  <Building2 className="mr-2 h-4 w-4" />
                  View Organizations
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Tools">
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/tools'))}
                >
                  <Wrench className="mr-2 h-4 w-4" />
                  DNS Lookup
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/tools/generator'))}
                >
                  <Shield className="mr-2 h-4 w-4" />
                  DMARC Generator
                </CommandItem>
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Help & Settings">
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/help'))}
                >
                  <HelpCircle className="mr-2 h-4 w-4" />
                  Help Center
                </CommandItem>
                <CommandItem
                  onSelect={() => runCommand(() => router.push('/settings'))}
                >
                  <Settings className="mr-2 h-4 w-4" />
                  User Settings
                </CommandItem>
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
