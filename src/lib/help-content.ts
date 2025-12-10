import {
  BookOpen,
  BookMarked,
  Compass,
  BarChart3,
  AlertCircle,
  Shield,
  Mail,
  Server,
  Settings,
  Globe,
  CheckCircle2,
  Bell,
  type LucideIcon,
} from 'lucide-react';

export interface HelpArticle {
  id: string;
  title: string;
  description: string;
  category: HelpCategory;
  icon: LucideIcon;
  href: string;
  content: string;
  keywords: string[];
  relatedArticles?: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: HelpCategory;
  keywords: string[];
}

export type HelpCategory =
  | 'getting-started'
  | 'dmarc-basics'
  | 'features'
  | 'troubleshooting'
  | 'configuration'
  | 'reports';

export interface HelpCategoryInfo {
  id: HelpCategory;
  name: string;
  description: string;
  icon: LucideIcon;
}

export const helpCategories: HelpCategoryInfo[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics and set up your first domain',
    icon: Compass,
  },
  {
    id: 'dmarc-basics',
    name: 'DMARC Basics',
    description: 'Understand DMARC, SPF, and DKIM fundamentals',
    icon: BookOpen,
  },
  {
    id: 'features',
    name: 'Features',
    description: 'Explore all the features of DMARC Analyser',
    icon: BarChart3,
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    description: 'Learn to read and interpret your DMARC data',
    icon: Mail,
  },
  {
    id: 'configuration',
    name: 'Configuration',
    description: 'Configure domains, policies, and integrations',
    icon: Settings,
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Find solutions to common issues',
    icon: AlertCircle,
  },
];

export const helpArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Quick Start Guide',
    description: 'Learn how to set up your first domain and start analyzing DMARC reports',
    category: 'getting-started',
    icon: Compass,
    href: '/help/getting-started',
    content: 'Complete guide to getting started with DMARC Analyser',
    keywords: [
      'getting started',
      'setup',
      'first domain',
      'quick start',
      'onboarding',
      'begin',
      'start',
      'new',
    ],
    relatedArticles: ['dmarc-basics', 'understanding-reports'],
  },
  {
    id: 'dmarc-basics',
    title: 'DMARC Basics',
    description: 'Understand what DMARC is and how it protects your email domain',
    category: 'dmarc-basics',
    icon: BookOpen,
    href: '/help/dmarc-basics',
    content: 'Learn about DMARC, SPF, DKIM and email authentication',
    keywords: [
      'dmarc',
      'spf',
      'dkim',
      'email authentication',
      'basics',
      'fundamentals',
      'what is',
      'introduction',
      'policy',
      'alignment',
    ],
    relatedArticles: ['understanding-reports', 'glossary'],
  },
  {
    id: 'understanding-reports',
    title: 'Understanding Reports',
    description: 'Learn how to read and interpret DMARC aggregate and forensic reports',
    category: 'reports',
    icon: BarChart3,
    href: '/help/understanding-reports',
    content: 'Guide to reading and understanding DMARC reports',
    keywords: [
      'reports',
      'aggregate',
      'forensic',
      'interpret',
      'read',
      'understand',
      'analyze',
      'data',
      'statistics',
    ],
    relatedArticles: ['dmarc-basics', 'troubleshooting'],
  },
  {
    id: 'glossary',
    title: 'Glossary',
    description: 'Common DMARC and email authentication terms explained',
    category: 'dmarc-basics',
    icon: BookMarked,
    href: '/help/glossary',
    content: 'Definitions of common DMARC terms',
    keywords: [
      'glossary',
      'terms',
      'definitions',
      'dictionary',
      'vocabulary',
      'terminology',
      'meaning',
    ],
    relatedArticles: ['dmarc-basics'],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    description: 'Solutions to common issues and problems',
    category: 'troubleshooting',
    icon: AlertCircle,
    href: '/help/troubleshooting',
    content: 'Common problems and their solutions',
    keywords: [
      'troubleshooting',
      'problems',
      'issues',
      'errors',
      'fix',
      'solve',
      'help',
      'not working',
      'broken',
      'failed',
    ],
    relatedArticles: ['dmarc-basics', 'understanding-reports'],
  },
  {
    id: 'dns-records',
    title: 'Setting Up DNS Records',
    description: 'How to configure DMARC, SPF, and DKIM DNS records',
    category: 'configuration',
    icon: Globe,
    href: '/help/dns-records',
    content: 'Guide to configuring DNS records',
    keywords: [
      'dns',
      'records',
      'configure',
      'setup',
      'txt record',
      'nameserver',
      'domain',
      'hosting',
    ],
    relatedArticles: ['dmarc-basics', 'troubleshooting'],
  },
  {
    id: 'gmail-import',
    title: 'Gmail Report Import',
    description: 'Automatically import DMARC reports from Gmail',
    category: 'features',
    icon: Mail,
    href: '/help/gmail-import',
    content: 'How to connect Gmail for automatic report import',
    keywords: ['gmail', 'import', 'automatic', 'reports', 'oauth', 'connect', 'integration'],
    relatedArticles: ['getting-started', 'understanding-reports'],
  },
  {
    id: 'alerts',
    title: 'Alert Configuration',
    description: 'Set up alerts for authentication failures and anomalies',
    category: 'features',
    icon: Bell,
    href: '/help/alerts',
    content: 'Configure alerts and notifications',
    keywords: [
      'alerts',
      'notifications',
      'email',
      'warnings',
      'monitoring',
      'rules',
      'configure',
    ],
    relatedArticles: ['troubleshooting'],
  },
  {
    id: 'sources',
    title: 'Managing Email Sources',
    description: 'Identify and manage authorized email sending sources',
    category: 'features',
    icon: Server,
    href: '/help/sources',
    content: 'Learn about email sources and known senders',
    keywords: [
      'sources',
      'senders',
      'ip addresses',
      'authorized',
      'whitelist',
      'servers',
      'providers',
    ],
    relatedArticles: ['dmarc-basics', 'troubleshooting'],
  },
  {
    id: 'dmarc-policies',
    title: 'DMARC Policy Recommendations',
    description: 'Choose the right DMARC policy for your domain',
    category: 'configuration',
    icon: Shield,
    href: '/help/policies',
    content: 'Guidance on selecting DMARC policies',
    keywords: [
      'policy',
      'none',
      'quarantine',
      'reject',
      'recommendations',
      'enforcement',
      'protection',
    ],
    relatedArticles: ['dmarc-basics', 'troubleshooting'],
  },
];

export const faqs: FAQ[] = [
  {
    id: 'what-is-dmarc',
    question: 'What is DMARC?',
    answer:
      'DMARC (Domain-based Message Authentication, Reporting, and Conformance) is an email authentication protocol that helps protect your domain from email spoofing and phishing attacks. It works alongside SPF and DKIM to verify that emails claiming to be from your domain are actually legitimate.',
    category: 'dmarc-basics',
    keywords: ['dmarc', 'what is', 'definition', 'basics', 'introduction'],
  },
  {
    id: 'why-dmarc',
    question: 'Why do I need DMARC?',
    answer:
      'DMARC protects your brand reputation, prevents email spoofing and phishing attacks using your domain, improves email deliverability, and provides visibility into who is sending email on behalf of your domain. Many organizations and email providers now require DMARC for enhanced security.',
    category: 'dmarc-basics',
    keywords: ['why', 'benefits', 'importance', 'need', 'reasons'],
  },
  {
    id: 'spf-vs-dkim',
    question: 'What is the difference between SPF and DKIM?',
    answer:
      'SPF (Sender Policy Framework) validates that email is sent from an authorized IP address, while DKIM (DomainKeys Identified Mail) uses cryptographic signatures to verify the email content has not been tampered with. DMARC requires at least one of these to pass AND align with the From domain.',
    category: 'dmarc-basics',
    keywords: ['spf', 'dkim', 'difference', 'comparison', 'versus'],
  },
  {
    id: 'no-reports',
    question: 'Why am I not receiving DMARC reports?',
    answer:
      'Common reasons include: incorrect rua tag in your DMARC record, the reporting email address is rejecting reports, DNS propagation has not completed (wait 24-48 hours), or your domain is not receiving enough email traffic to generate reports. Verify your DMARC record using the DNS Lookup tool.',
    category: 'troubleshooting',
    keywords: ['no reports', 'missing reports', 'not receiving', 'rua'],
  },
  {
    id: 'policy-recommendation',
    question: 'What DMARC policy should I use?',
    answer:
      'Start with p=none to monitor without affecting email delivery. Once you have analyzed reports and fixed any authentication issues, move to p=quarantine. Finally, move to p=reject for maximum protection only when you are confident all legitimate email will pass. This gradual rollout typically takes 3-6 months.',
    category: 'configuration',
    keywords: ['policy', 'recommendation', 'none', 'quarantine', 'reject', 'which'],
  },
  {
    id: 'spf-too-many-lookups',
    question: 'What does "SPF too many lookups" mean?',
    answer:
      'SPF has a limit of 10 DNS lookups to prevent abuse. If your SPF record includes too many domains with their own SPF records, you will exceed this limit and SPF will fail. Solution: flatten your SPF record by replacing "include" mechanisms with direct IP addresses where possible, or use an SPF flattening service.',
    category: 'troubleshooting',
    keywords: ['spf', 'too many lookups', 'limit', 'error', 'permerror'],
  },
  {
    id: 'alignment-failure',
    question: 'Why is DMARC failing when SPF and DKIM pass?',
    answer:
      'DMARC requires alignment, meaning the domain in the From header must match the domain authenticated by SPF or DKIM. If the domains differ (e.g., email from "user@example.com" but SPF authenticates "mail.sender.com"), DMARC fails. Check your email infrastructure to ensure domain alignment.',
    category: 'troubleshooting',
    keywords: ['alignment', 'failure', 'pass but fail', 'mismatch'],
  },
  {
    id: 'subdomain-policy',
    question: 'Do I need a DMARC record for each subdomain?',
    answer:
      'Not necessarily. If you set a subdomain policy (sp tag) in your organizational domain DMARC record, it will apply to all subdomains without their own records. However, you can create specific DMARC records for individual subdomains if they need different policies.',
    category: 'configuration',
    keywords: ['subdomain', 'sp tag', 'policy', 'organizational domain'],
  },
  {
    id: 'how-often-reports',
    question: 'How often are DMARC reports sent?',
    answer:
      'Aggregate reports are typically sent once per day by most email providers, though the exact timing varies. They cover a 24-hour period and are usually sent within a few hours after the period ends. Forensic reports are sent in real-time when a message fails DMARC authentication.',
    category: 'reports',
    keywords: ['frequency', 'how often', 'schedule', 'timing', 'daily'],
  },
  {
    id: 'legitimate-emails-blocked',
    question: 'DMARC is blocking legitimate emails, what should I do?',
    answer:
      'First, temporarily change your policy to p=quarantine or p=none to reduce impact. Then identify which sources are failing by reviewing your reports. Add those legitimate sources to your SPF record, set up DKIM for them, or work with the service provider to fix authentication. Only restore p=reject once the issue is resolved.',
    category: 'troubleshooting',
    keywords: ['blocked', 'legitimate', 'false positive', 'rejected', 'not receiving'],
  },
];

export function searchHelpContent(query: string): {
  articles: HelpArticle[];
  faqs: FAQ[];
} {
  const normalizedQuery = query.toLowerCase().trim();

  if (!normalizedQuery) {
    return { articles: [], faqs: [] };
  }

  const searchTerms = normalizedQuery.split(' ');

  // Score and filter articles
  const scoredArticles = helpArticles.map((article) => {
    let score = 0;
    const searchableText = `${article.title} ${article.description} ${article.content} ${article.keywords.join(
      ' '
    )}`.toLowerCase();

    // Exact title match gets highest score
    if (article.title.toLowerCase().includes(normalizedQuery)) {
      score += 100;
    }

    // Description match
    if (article.description.toLowerCase().includes(normalizedQuery)) {
      score += 50;
    }

    // Keyword matches
    article.keywords.forEach((keyword) => {
      if (keyword.includes(normalizedQuery)) {
        score += 30;
      }
    });

    // Individual term matches
    searchTerms.forEach((term) => {
      if (term.length > 2 && searchableText.includes(term)) {
        score += 10;
      }
    });

    return { article, score };
  });

  const filteredArticles = scoredArticles
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);

  // Score and filter FAQs
  const scoredFaqs = faqs.map((faq) => {
    let score = 0;
    const searchableText =
      `${faq.question} ${faq.answer} ${faq.keywords.join(' ')}`.toLowerCase();

    // Exact question match gets highest score
    if (faq.question.toLowerCase().includes(normalizedQuery)) {
      score += 100;
    }

    // Answer match
    if (faq.answer.toLowerCase().includes(normalizedQuery)) {
      score += 30;
    }

    // Keyword matches
    faq.keywords.forEach((keyword) => {
      if (keyword.includes(normalizedQuery)) {
        score += 20;
      }
    });

    // Individual term matches
    searchTerms.forEach((term) => {
      if (term.length > 2 && searchableText.includes(term)) {
        score += 5;
      }
    });

    return { faq, score };
  });

  const filteredFaqs = scoredFaqs
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // Limit FAQs to top 5
    .map(({ faq }) => faq);

  return {
    articles: filteredArticles,
    faqs: filteredFaqs,
  };
}

export function getArticlesByCategory(category: HelpCategory): HelpArticle[] {
  return helpArticles.filter((article) => article.category === category);
}

export function getArticleById(id: string): HelpArticle | undefined {
  return helpArticles.find((article) => article.id === id);
}

export function getRelatedArticles(articleId: string): HelpArticle[] {
  const article = getArticleById(articleId);
  if (!article || !article.relatedArticles) {
    return [];
  }

  return article.relatedArticles
    .map((id) => getArticleById(id))
    .filter((a): a is HelpArticle => a !== undefined);
}

export function getFaqsByCategory(category: HelpCategory): FAQ[] {
  return faqs.filter((faq) => faq.category === category);
}
