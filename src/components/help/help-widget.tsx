'use client';

import * as React from 'react';
import Link from 'next/link';
import { HelpCircle, X, Search, BookOpen, MessagesSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { searchHelpContent, helpArticles, faqs } from '@/lib/help-content';

interface HelpWidgetProps {
  className?: string;
}

export function HelpWidget({ className }: HelpWidgetProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const searchResults = React.useMemo(() => {
    if (!searchQuery) return { articles: [], faqs: [] };
    return searchHelpContent(searchQuery);
  }, [searchQuery]);

  const popularArticles = React.useMemo(() => {
    return helpArticles.slice(0, 5);
  }, []);

  const popularFaqs = React.useMemo(() => {
    return faqs.slice(0, 5);
  }, []);

  const displayArticles = searchQuery ? searchResults.articles.slice(0, 5) : popularArticles;
  const displayFaqs = searchQuery ? searchResults.faqs : popularFaqs;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          size="lg"
          className={cn(
            'fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50',
            'hover:scale-110 transition-transform',
            className
          )}
          aria-label="Open help"
        >
          <HelpCircle className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help & Support
          </SheetTitle>
          <SheetDescription>
            Search our help articles or browse common questions
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <ScrollArea className="h-[calc(100vh-250px)]">
            <div className="space-y-6 pr-4">
              {/* Quick Actions */}
              {!searchQuery && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Quick Links</h3>
                  <div className="space-y-2">
                    <Link
                      href="/help"
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <div className="rounded-lg bg-primary/10 p-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">Browse All Articles</div>
                        <div className="text-xs text-muted-foreground">
                          View complete help center
                        </div>
                      </div>
                    </Link>
                  </div>
                </div>
              )}

              {/* Search Results or Popular Articles */}
              {displayArticles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {searchQuery ? 'Articles' : 'Popular Articles'}
                    </h3>
                    {searchQuery && (
                      <Badge variant="secondary">{displayArticles.length}</Badge>
                    )}
                  </div>
                  <div className="space-y-2">
                    {displayArticles.map((article) => {
                      const Icon = article.icon;
                      return (
                        <Link
                          key={article.id}
                          href={article.href}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                        >
                          <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm leading-tight">
                              {article.title}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {article.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* FAQs */}
              {displayFaqs.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {searchQuery ? 'Common Questions' : 'Frequently Asked'}
                    </h3>
                    {searchQuery && <Badge variant="secondary">{displayFaqs.length}</Badge>}
                  </div>
                  <div className="space-y-2">
                    {displayFaqs.map((faq) => (
                      <Link
                        key={faq.id}
                        href={`/help#faq-${faq.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <MessagesSquare className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm leading-tight">
                            {faq.question}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {searchQuery &&
                displayArticles.length === 0 &&
                displayFaqs.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">
                      No results found for "{searchQuery}"
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => setSearchQuery('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
