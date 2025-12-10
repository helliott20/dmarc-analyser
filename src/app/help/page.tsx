'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, ExternalLink, ChevronDown } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  helpCategories,
  helpArticles,
  faqs,
  searchHelpContent,
  type HelpCategory,
} from '@/lib/help-content';

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<HelpCategory | 'all'>('all');

  const searchResults = useMemo(() => {
    if (!searchQuery) return { articles: [], faqs: [] };
    return searchHelpContent(searchQuery);
  }, [searchQuery]);

  const filteredArticles = useMemo(() => {
    if (searchQuery) return searchResults.articles;

    if (selectedCategory === 'all') return helpArticles;

    return helpArticles.filter((article) => article.category === selectedCategory);
  }, [searchQuery, selectedCategory, searchResults]);

  const filteredFaqs = useMemo(() => {
    if (searchQuery) return searchResults.faqs;

    if (selectedCategory === 'all') return faqs;

    return faqs.filter((faq) => faq.category === selectedCategory);
  }, [searchQuery, selectedCategory, searchResults]);

  const isSearching = searchQuery.length > 0;

  return (
    <div className="space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbPage>Help</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Help Center</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Everything you need to know about DMARC Analyser
        </p>
      </div>

      {/* Search */}
      <div className="max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search help articles and FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-base"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              Clear
            </Button>
          )}
        </div>
        {isSearching && (
          <p className="text-sm text-muted-foreground mt-2 text-center">
            Found {filteredArticles.length} article{filteredArticles.length !== 1 ? 's' : ''} and{' '}
            {filteredFaqs.length} question{filteredFaqs.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Categories */}
      {!isSearching && (
        <div className="border-b">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
              className="whitespace-nowrap"
            >
              All Topics
            </Button>
            {helpCategories.map((category) => {
              const Icon = category.icon;
              const articleCount = helpArticles.filter(
                (a) => a.category === category.id
              ).length;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="whitespace-nowrap gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category.name}
                  <Badge variant="secondary" className="ml-1">
                    {articleCount}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Description */}
      {!isSearching && selectedCategory !== 'all' && (
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader>
            {(() => {
              const category = helpCategories.find((c) => c.id === selectedCategory);
              const Icon = category?.icon;
              return (
                <div className="flex items-start gap-3">
                  {Icon && (
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div>
                    <CardTitle>{category?.name}</CardTitle>
                    <CardDescription className="text-base mt-1">
                      {category?.description}
                    </CardDescription>
                  </div>
                </div>
              );
            })()}
          </CardHeader>
        </Card>
      )}

      {/* Articles */}
      {filteredArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {isSearching ? 'Articles' : selectedCategory === 'all' ? 'All Articles' : 'Articles'}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {filteredArticles.map((article) => {
              const Icon = article.icon;
              return (
                <Link key={article.id} href={article.href}>
                  <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="rounded-lg bg-primary/10 p-3 flex-shrink-0">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-lg">{article.title}</CardTitle>
                            <ExternalLink className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                          </div>
                          <CardDescription className="text-sm">
                            {article.description}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* FAQs */}
      {filteredFaqs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">
            {isSearching ? 'Common Questions' : 'Frequently Asked Questions'}
          </h2>
          <Accordion type="single" collapsible className="space-y-2">
            {filteredFaqs.map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                id={`faq-${faq.id}`}
                className="border rounded-lg px-4 bg-card scroll-mt-8"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4">
                  <span className="font-medium">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-4">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      )}

      {/* No Results */}
      {filteredArticles.length === 0 && filteredFaqs.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-lg">
            {isSearching
              ? `No help articles or questions found matching "${searchQuery}"`
              : 'No articles found in this category'}
          </p>
          {isSearching && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setSearchQuery('')}
            >
              Clear Search
            </Button>
          )}
        </div>
      )}

      {/* Additional Help */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription className="text-base">
            Can't find what you're looking for? Here are some additional resources:
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/tools"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            DNS Lookup Tool - Test your DMARC, SPF, and DKIM records
          </Link>
          <Link
            href="/tools/generator"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            DMARC Generator - Create a DMARC record for your domain
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
