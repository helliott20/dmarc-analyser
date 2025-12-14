/**
 * SEO utilities and metadata generation
 */

export interface SEOMetadata {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
}

export const SEO = {
  // Metadata for Homepage
  home: {
    title: 'DMARC Analyser - Monitor & Protect Email Reputation',
    description: 'Real-time DMARC monitoring, AI-powered insights, and email authentication analysis. Secure your domain with automated SPF, DKIM, and DMARC reports. Start free.',
    keywords: 'DMARC monitoring, email authentication, SPF, DKIM, email security, deliverability'
  },

  // Metadata for Pricing Page
  pricing: {
    title: 'DMARC Analyser Pricing - Transparent, Usage-Based Billing',
    description: 'Simple, transparent pricing starting at just £10/month. Monitor multiple domains with AI recommendations. 14-day free trial, no credit card required.',
    keywords: 'DMARC pricing, cost, billing, subscription, email authentication'
  },

  // Metadata for Privacy Page
  privacy: {
    title: 'Privacy Policy - DMARC Analyser by Redactbox',
    description: 'Privacy policy for DMARC Analyser. Learn how we protect your data and respect your privacy.',
  },

  // Metadata for Terms Page
  terms: {
    title: 'Terms of Service - DMARC Analyser by Redactbox',
    description: 'Terms of service for DMARC Analyser. Review our service terms and conditions.',
  }
} as const;

/**
 * Generate JSON-LD structured data for Organization
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Redactbox',
    url: 'https://redactbox.com',
    logo: 'https://dmarc-analyser.com/logo.png',
    description: 'Redactbox - Building security and compliance tools for email',
    sameAs: [
      'https://github.com/helliott20/dmarc-analyser',
      'https://twitter.com/redactbox',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      url: 'https://dmarc-analyser.com'
    }
  };
}

/**
 * Generate JSON-LD structured data for SoftwareApplication
 */
export function getSoftwareApplicationSchema(baseUrl: string = 'https://dmarc-analyser.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DMARC Analyser',
    description: 'Monitor and analyze your email authentication with DMARC, SPF, and DKIM reports. Get real-time insights and AI-powered recommendations.',
    url: baseUrl,
    applicationCategory: 'BusinessApplication',
    offers: {
      '@type': 'Offer',
      price: '10',
      priceCurrency: 'GBP',
      url: `${baseUrl}/pricing`
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '24'
    },
    screenshot: [
      `${baseUrl}/screenshots/dashboard.png`,
      `${baseUrl}/screenshots/reports.png`,
      `${baseUrl}/screenshots/analytics.png`
    ],
    operatingSystem: 'Cloud, Self-Hosted',
    requires: ['Email Authentication Setup'],
    featureList: [
      'Real-time DMARC monitoring',
      'AI-powered recommendations',
      'Geographic tracking',
      'Automated alerts',
      'API access',
      'Webhook integrations',
      'Unlimited team members',
      'Gmail/Workspace sync'
    ]
  };
}

/**
 * Generate JSON-LD structured data for Pricing/Offer
 */
export function getPricingSchema(baseUrl: string = 'https://dmarc-analyser.com') {
  return {
    '@context': 'https://schema.org',
    '@type': 'AggregateOffer',
    priceCurrency: 'GBP',
    offerCount: '2',
    offers: [
      {
        '@type': 'Offer',
        name: 'Free Trial',
        description: '14-day free trial with full feature access',
        price: '0',
        priceCurrency: 'GBP',
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/pricing`
      },
      {
        '@type': 'Offer',
        name: 'Usage-Based Subscription',
        description: 'Pay only for what you use. £10/month base + £3/domain/month',
        price: '10',
        priceCurrency: 'GBP',
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        availability: 'https://schema.org/InStock',
        url: `${baseUrl}/pricing`
      }
    ]
  };
}

/**
 * Generate JSON-LD structured data for FAQPage
 */
export function getFAQSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How does the free trial work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Your 14-day free trial starts when you create an account. During the trial, you have full access to all features with no limits. No credit card is required to start. At the end of the trial, you can subscribe to continue using the service.'
        }
      },
      {
        '@type': 'Question',
        name: 'What counts as a domain?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Each unique domain you add for monitoring counts as one domain. Subdomains (like mail.example.com) are tracked under their parent domain and don\'t count separately. You\'re only charged for domains you actively monitor.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can I cancel anytime?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! You can cancel your subscription at any time from your account settings. Your access will continue until the end of your current billing period. We don\'t offer refunds for partial months, but you won\'t be charged again after cancellation.'
        }
      },
      {
        '@type': 'Question',
        name: 'Can I self-host DMARC Analyser?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes! DMARC Analyser is open source. You can deploy it yourself using Docker with no limits and no subscription fees. Visit our GitHub repository for documentation.'
        }
      }
    ]
  };
}

/**
 * Generate JSON-LD structured data for BreadcrumbList
 */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}
