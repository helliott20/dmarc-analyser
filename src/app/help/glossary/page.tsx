'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface GlossaryTerm {
  term: string;
  definition: string;
  example?: string;
  relatedTerms?: string[];
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: 'Aggregate Report',
    definition:
      'A summary report sent by receiving mail servers that contains statistics about email messages claiming to be from your domain. These reports are sent to the address specified in your DMARC RUA tag.',
    example: 'rua=mailto:dmarc@example.com',
    relatedTerms: ['RUA', 'Forensic Report'],
  },
  {
    term: 'Alignment',
    definition:
      'The process of matching the domain in the "From:" header with the domain used in SPF and/or DKIM authentication. DMARC requires at least one of these to align for a message to pass.',
    relatedTerms: ['SPF', 'DKIM', 'Identifier Alignment'],
  },
  {
    term: 'BIMI',
    definition:
      'Brand Indicators for Message Identification. An email specification that enables the use of brand-controlled logos within supporting email clients. BIMI requires a valid DMARC policy of "quarantine" or "reject".',
    relatedTerms: ['DMARC'],
  },
  {
    term: 'DKIM',
    definition:
      'DomainKeys Identified Mail. An email authentication method that allows an organization to take responsibility for transmitting a message by signing it with a cryptographic signature.',
    example: 'A DKIM signature appears in email headers as "DKIM-Signature:"',
    relatedTerms: ['SPF', 'DMARC', 'Authentication'],
  },
  {
    term: 'DMARC',
    definition:
      'Domain-based Message Authentication, Reporting, and Conformance. An email authentication protocol that uses SPF and DKIM to determine the authenticity of an email message. It allows domain owners to specify how receiving servers should handle emails that fail authentication.',
    relatedTerms: ['SPF', 'DKIM', 'Policy'],
  },
  {
    term: 'Disposition',
    definition:
      'The action taken by the receiving mail server on a message based on DMARC evaluation. Common dispositions include "none", "quarantine", and "reject".',
    relatedTerms: ['Policy', 'Quarantine', 'Reject'],
  },
  {
    term: 'Fail',
    definition:
      'Indicates that an email authentication check (SPF, DKIM, or DMARC) did not succeed. A DMARC fail means neither SPF nor DKIM aligned with the From domain.',
    relatedTerms: ['Pass', 'Authentication'],
  },
  {
    term: 'Forensic Report',
    definition:
      'Also called failure reports or RUF reports. Individual detailed reports sent when a message fails DMARC authentication. These contain copies or information about specific failed messages.',
    example: 'ruf=mailto:forensic@example.com',
    relatedTerms: ['RUF', 'Aggregate Report'],
  },
  {
    term: 'Identifier Alignment',
    definition:
      'The requirement in DMARC that the domain in the "From:" header must match (align with) the domain authenticated by SPF or DKIM. Can be either strict or relaxed.',
    relatedTerms: ['Alignment', 'SPF', 'DKIM'],
  },
  {
    term: 'MTA-STS',
    definition:
      'Mail Transfer Agent Strict Transport Security. A mechanism enabling mail service providers to declare their ability to receive TLS-secured connections and to specify whether sending SMTP servers should refuse to deliver to MX hosts that do not offer TLS.',
    relatedTerms: ['TLS', 'SMTP'],
  },
  {
    term: 'Pass',
    definition:
      'Indicates that an email authentication check (SPF, DKIM, or DMARC) succeeded. A DMARC pass means at least one of SPF or DKIM aligned with the From domain and authenticated successfully.',
    relatedTerms: ['Fail', 'Authentication'],
  },
  {
    term: 'Policy',
    definition:
      'The instruction in a DMARC record telling receiving servers what to do with emails that fail DMARC checks. The three policies are: none (monitor only), quarantine (mark as spam), and reject (block delivery).',
    example: 'p=none, p=quarantine, p=reject',
    relatedTerms: ['None', 'Quarantine', 'Reject'],
  },
  {
    term: 'Quarantine',
    definition:
      'A DMARC policy that instructs receiving mail servers to treat messages that fail DMARC as suspicious, typically by placing them in the spam or junk folder rather than the inbox.',
    relatedTerms: ['Policy', 'Reject', 'None'],
  },
  {
    term: 'Reject',
    definition:
      'The strictest DMARC policy that instructs receiving mail servers to reject (not deliver) messages that fail DMARC authentication.',
    relatedTerms: ['Policy', 'Quarantine', 'None'],
  },
  {
    term: 'RUA',
    definition:
      'Reporting URI for Aggregate reports. The email address where DMARC aggregate reports should be sent. Specified in DMARC records as rua=mailto:address@example.com.',
    example: 'rua=mailto:dmarc-reports@example.com',
    relatedTerms: ['Aggregate Report', 'RUF'],
  },
  {
    term: 'RUF',
    definition:
      'Reporting URI for Forensic reports. The email address where DMARC forensic (failure) reports should be sent. Specified in DMARC records as ruf=mailto:address@example.com.',
    example: 'ruf=mailto:dmarc-forensic@example.com',
    relatedTerms: ['Forensic Report', 'RUA'],
  },
  {
    term: 'SPF',
    definition:
      'Sender Policy Framework. An email authentication method that allows domain owners to specify which IP addresses are authorized to send email on behalf of their domain.',
    example: 'v=spf1 ip4:192.0.2.0/24 include:_spf.example.com ~all',
    relatedTerms: ['DKIM', 'DMARC', 'Authentication'],
  },
  {
    term: 'Subdomain Policy',
    definition:
      'A specific DMARC policy that applies to subdomains of the organizational domain. Specified using the "sp" tag in a DMARC record.',
    example: 'sp=quarantine',
    relatedTerms: ['Policy'],
  },
];

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTerms = glossaryTerms.filter(
    (item) =>
      item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group terms by first letter
  const groupedTerms = filteredTerms.reduce((acc, term) => {
    const firstLetter = term.term[0].toUpperCase();
    if (!acc[firstLetter]) {
      acc[firstLetter] = [];
    }
    acc[firstLetter].push(term);
    return acc;
  }, {} as Record<string, GlossaryTerm[]>);

  const letters = Object.keys(groupedTerms).sort();

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-8">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/login">Login</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/help">Help</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbPage>Glossary</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Glossary</h1>
        <p className="text-xl text-muted-foreground">
          Common DMARC and email authentication terms explained
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Navigation */}
      {!searchQuery && (
        <Card>
          <CardHeader>
            <CardTitle>Jump to Letter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {letters.map((letter) => (
                <a
                  key={letter}
                  href={`#letter-${letter}`}
                  className="w-10 h-10 flex items-center justify-center rounded-md border hover:bg-muted transition-colors font-medium"
                >
                  {letter}
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Terms */}
      <div className="space-y-8">
        {letters.map((letter) => (
          <div key={letter} id={`letter-${letter}`} className="scroll-mt-8">
            <h2 className="text-3xl font-bold mb-4 pb-2 border-b">{letter}</h2>
            <div className="space-y-4">
              {groupedTerms[letter].map((term) => (
                <Collapsible key={term.term}>
                  <Card>
                    <CollapsibleTrigger className="w-full text-left">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <CardTitle className="text-xl">{term.term}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {term.definition}
                        </CardDescription>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-4">
                          <p className="text-muted-foreground">{term.definition}</p>

                          {term.example && (
                            <div>
                              <h4 className="font-semibold mb-2">Example:</h4>
                              <code className="block bg-muted px-4 py-2 rounded-md text-sm">
                                {term.example}
                              </code>
                            </div>
                          )}

                          {term.relatedTerms && term.relatedTerms.length > 0 && (
                            <div>
                              <h4 className="font-semibold mb-2">Related Terms:</h4>
                              <div className="flex flex-wrap gap-2">
                                {term.relatedTerms.map((relatedTerm) => (
                                  <span
                                    key={relatedTerm}
                                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                                  >
                                    {relatedTerm}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredTerms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No terms found matching your search.
          </p>
        </div>
      )}
    </div>
  );
}
