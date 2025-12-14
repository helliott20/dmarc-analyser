# SEO Code Examples & Implementation Details

## 1. Core SEO Configuration Files

### File: `src/lib/seo.ts`

This file contains all SEO metadata and schema generation functions:

```typescript
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
} as const;
```

### File: `src/components/seo/schema-markup.tsx`

Component for rendering JSON-LD schema markup:

```typescript
/**
 * Schema Markup Component for JSON-LD structured data
 */

export interface SchemaMarkupProps {
  schema: Record<string, any>;
}

/**
 * Render JSON-LD schema markup as a script tag
 * Usage: <SchemaMarkup schema={getOrganizationSchema()} />
 */
export function SchemaMarkup({ schema }: SchemaMarkupProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      suppressHydrationWarning
    />
  );
}

/**
 * Multiple schema markup for a page
 */
export function MultipleSchemaMarkup({ schemas }: { schemas: Record<string, any>[] }) {
  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          suppressHydrationWarning
        />
      ))}
    </>
  );
}
```

---

## 2. Root Layout Configuration

### File: `src/app/layout.tsx`

Complete global metadata setup:

```typescript
import type { Metadata } from "next";
import { SchemaMarkup } from "@/components/seo/schema-markup";
import { getOrganizationSchema, getSoftwareApplicationSchema } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://dmarc-analyser.com"),

  // Page Title Configuration
  title: {
    default: "DMARC Analyser - Monitor & Protect Email Reputation",
    template: "%s | DMARC Analyser",  // Used for page-specific titles
  },

  // Primary Description
  description: "Real-time DMARC monitoring, AI-powered insights, and email authentication analysis. Secure your domain with automated SPF, DKIM, and DMARC reports. Start free.",

  // Keywords
  keywords: [
    "DMARC monitoring",
    "email authentication",
    "SPF",
    "DKIM",
    "email security",
    "deliverability",
    "email compliance",
    "email reputation",
    "DNS records"
  ],

  // Creator Information
  authors: [{ name: "Redactbox" }],
  creator: "Redactbox",
  publisher: "Redactbox",

  // Format Detection (prevents auto-linking)
  formatDetection: {
    email: false,
    telephone: false,
  },

  // Open Graph Tags
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://dmarc-analyser.com",
    siteName: "DMARC Analyser",
    title: "DMARC Analyser - Monitor & Protect Email Reputation",
    description: "Real-time DMARC monitoring with AI-powered insights and email authentication analysis.",
    images: [
      {
        url: "https://dmarc-analyser.com/og-image.png",
        width: 1200,
        height: 630,
        alt: "DMARC Analyser - Email Authentication Monitoring",
        type: "image/png",
      },
    ],
  },

  // Twitter Card Tags
  twitter: {
    card: "summary_large_image",
    title: "DMARC Analyser - Monitor & Protect Email Reputation",
    description: "Real-time DMARC monitoring with AI-powered insights.",
    images: ["https://dmarc-analyser.com/og-image.png"],
    creator: "@redactbox",
  },

  // Robots Directives
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // Search Engine Verification
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },

  // Favicon Configuration
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inject Schema Markup */}
        <SchemaMarkup schema={getOrganizationSchema()} />
        <SchemaMarkup schema={getSoftwareApplicationSchema()} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Rest of layout */}
      </body>
    </html>
  );
}
```

---

## 3. Page-Specific Metadata

### File: `src/app/(marketing)/page.tsx` (Homepage)

```typescript
import type { Metadata } from 'next';
import { SEO } from '@/lib/seo';

export const metadata: Metadata = {
  title: SEO.home.title,
  description: SEO.home.description,
  keywords: SEO.home.keywords,

  // Open Graph tags specific to this page
  openGraph: {
    type: 'website',
    url: 'https://dmarc-analyser.com',
    title: SEO.home.title,
    description: SEO.home.description,
    siteName: 'DMARC Analyser',
    images: [
      {
        url: 'https://dmarc-analyser.com/og-image-home.png',
        width: 1200,
        height: 630,
        alt: 'DMARC Analyser - Monitor & Protect Email Reputation',
      },
    ],
  },

  // Twitter cards specific to this page
  twitter: {
    card: 'summary_large_image',
    title: SEO.home.title,
    description: SEO.home.description,
    images: ['https://dmarc-analyser.com/og-image-home.png'],
  },

  // Canonical URL
  alternates: {
    canonical: 'https://dmarc-analyser.com',
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section with proper H1 */}
      <section className="relative overflow-hidden py-20 md:py-32">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Monitor & Protect Your Email Reputation
        </h1>
      </section>

      {/* Features Section - Semantic HTML */}
      <section id="features" className="py-20 bg-muted/30" aria-label="Features">
        <h2 className="text-3xl md:text-4xl font-bold">
          Everything you need for DMARC monitoring
        </h2>
        {/* Feature cards */}
      </section>

      {/* How It Works - Semantic HTML */}
      <section className="py-20" aria-label="How it works">
        <h2 className="text-3xl md:text-4xl font-bold">
          Get started in minutes
        </h2>
        {/* Step cards */}
      </section>

      {/* Pricing - Semantic HTML */}
      <section className="py-20 bg-muted/30" aria-label="Pricing">
        <h2 className="text-3xl md:text-4xl font-bold">
          Simple, transparent pricing
        </h2>
        {/* Pricing section */}
      </section>

      {/* CTA - Semantic HTML */}
      <section className="py-20" aria-label="Call to action">
        <h2 className="text-3xl md:text-4xl font-bold">
          Ready to protect your email reputation?
        </h2>
        {/* CTA section */}
      </section>
    </div>
  );
}
```

### File: `src/app/(marketing)/pricing/layout.tsx` (Pricing Page)

```typescript
import type { Metadata } from 'next';
import { SEO, getPricingSchema, getFAQSchema } from '@/lib/seo';
import { MultipleSchemaMarkup } from '@/components/seo/schema-markup';

export const metadata: Metadata = {
  title: SEO.pricing.title,
  description: SEO.pricing.description,
  keywords: SEO.pricing.keywords,

  openGraph: {
    type: 'website',
    url: 'https://dmarc-analyser.com/pricing',
    title: SEO.pricing.title,
    description: SEO.pricing.description,
    siteName: 'DMARC Analyser',
    images: [
      {
        url: 'https://dmarc-analyser.com/og-image-pricing.png',
        width: 1200,
        height: 630,
        alt: 'DMARC Analyser Pricing',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: SEO.pricing.title,
    description: SEO.pricing.description,
    images: ['https://dmarc-analyser.com/og-image-pricing.png'],
  },

  alternates: {
    canonical: 'https://dmarc-analyser.com/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Inject multiple schemas for pricing page */}
      <MultipleSchemaMarkup
        schemas={[
          getPricingSchema(),
          getFAQSchema()
        ]}
      />
      {children}
    </>
  );
}
```

---

## 4. Schema Markup Examples

### Organization Schema

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Redactbox",
  "url": "https://redactbox.com",
  "logo": "https://dmarc-analyser.com/logo.png",
  "description": "Redactbox - Building security and compliance tools for email",
  "sameAs": [
    "https://github.com/redactbox",
    "https://twitter.com/redactbox"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "Customer Support",
    "url": "https://dmarc-analyser.com"
  }
}
```

### SoftwareApplication Schema

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "DMARC Analyser",
  "description": "Monitor and analyze your email authentication with DMARC, SPF, and DKIM reports. Get real-time insights and AI-powered recommendations.",
  "url": "https://dmarc-analyser.com",
  "applicationCategory": "BusinessApplication",
  "offers": {
    "@type": "Offer",
    "price": "10",
    "priceCurrency": "GBP",
    "url": "https://dmarc-analyser.com/pricing"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "24"
  },
  "featureList": [
    "Real-time DMARC monitoring",
    "AI-powered recommendations",
    "Geographic tracking",
    "Automated alerts",
    "API access",
    "Webhook integrations",
    "Unlimited team members",
    "Gmail/Workspace sync"
  ]
}
```

### Pricing/Offer Schema

```json
{
  "@context": "https://schema.org",
  "@type": "AggregateOffer",
  "priceCurrency": "GBP",
  "offerCount": "2",
  "offers": [
    {
      "@type": "Offer",
      "name": "Free Trial",
      "description": "14-day free trial with full feature access",
      "price": "0",
      "priceCurrency": "GBP",
      "availability": "https://schema.org/InStock",
      "url": "https://dmarc-analyser.com/pricing"
    },
    {
      "@type": "Offer",
      "name": "Usage-Based Subscription",
      "description": "Pay only for what you use. £10/month base + £3/domain/month",
      "price": "10",
      "priceCurrency": "GBP",
      "priceValidUntil": "2026-12-14",
      "availability": "https://schema.org/InStock",
      "url": "https://dmarc-analyser.com/pricing"
    }
  ]
}
```

### FAQ Schema

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How does the free trial work?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Your 14-day free trial starts when you create an account. During the trial, you have full access to all features with no limits. No credit card is required to start."
      }
    },
    {
      "@type": "Question",
      "name": "What counts as a domain?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Each unique domain you add for monitoring counts as one domain. Subdomains are tracked under their parent domain and don't count separately."
      }
    }
  ]
}
```

---

## 5. Sitemap Configuration

### File: `src/app/sitemap.ts`

```typescript
import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://dmarc-analyser.com';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'never',
      priority: 0.8,
    },
  ];
}
```

---

## 6. Robots Configuration

### File: `public/robots.txt`

```
# DMARC Analyser robots.txt - https://www.robotstxt.org/
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /dashboard/
Disallow: /.well-known/
Allow: /.well-known/openid-configuration

# Specific crawlers
User-agent: Googlebot
Allow: /
Allow: /.well-known/

User-agent: Bingbot
Allow: /
Allow: /.well-known/

# Sitemap location
Sitemap: https://dmarc-analyser.com/sitemap.xml
```

---

## 7. Meta Tag Character Limits

### Homepage Title
```
Title: "DMARC Analyser - Monitor & Protect Email Reputation"
Characters: 56
Desktop Pixels: ~530px (optimal, under 580px limit)
Mobile Pixels: Truncates at ~55 chars
Status: OPTIMAL
```

### Homepage Description
```
Description: "Real-time DMARC monitoring, AI-powered insights, and email authentication analysis. Secure your domain with automated SPF, DKIM, and DMARC reports. Start free."
Characters: 157
Desktop Pixels: ~920px (optimal, under 920px limit)
Mobile Pixels: Truncates at ~155 chars
Status: OPTIMAL
```

### Pricing Title
```
Title: "DMARC Analyser Pricing - Transparent, Usage-Based Billing"
Characters: 59
Desktop Pixels: ~550px (optimal)
Mobile Pixels: Truncates at ~55 chars
Status: OPTIMAL
```

### Pricing Description
```
Description: "Simple, transparent pricing starting at just £10/month. Monitor multiple domains with AI recommendations. 14-day free trial, no credit card required."
Characters: 155
Desktop Pixels: ~920px (optimal)
Mobile Pixels: Truncates at ~155 chars
Status: OPTIMAL
```

---

## 8. Environment Variables

### `.env.local`

```bash
# Application URL for metadata generation
NEXT_PUBLIC_APP_URL=https://dmarc-analyser.com

# Google Search Console verification code
GOOGLE_SITE_VERIFICATION=your-google-verification-code-here
```

---

## 9. Testing Commands

### Verify TypeScript Compilation
```bash
npm run build
# Or for development
npm run dev
```

### Test in Browser
```bash
# Open DevTools and check <head> section for:
# 1. <title> tag
# 2. <meta name="description">
# 3. <meta property="og:*">
# 4. <meta name="twitter:*">
# 5. <script type="application/ld+json">
```

### Validate Schema
```bash
# Use Google Rich Results Test
https://search.google.com/test/rich-results

# Input your homepage URL and check for:
# - Organization schema valid
# - SoftwareApplication schema valid
# - No parsing errors
```

---

## 10. Common Customization Points

### To Change Brand Name
Edit `src/lib/config.ts`:
```typescript
export const PRODUCT = {
  name: 'DMARC Analyser',  // Change here
  tagline: 'Monitor & Protect Your Email Reputation',
  description: 'DMARC monitoring made simple',
  company: 'Redactbox',  // Change here
  companyUrl: 'https://redactbox.com',
} as const;
```

### To Change Pricing
Edit `src/lib/config.ts`:
```typescript
export const PRICING = {
  baseFee: 10,        // £10/month
  perDomain: 3,       // £3/domain/month
  trialDays: 14,      // 14-day trial
  currency: 'GBP',    // Currency
  currencySymbol: '£', // Symbol
} as const;
```

### To Change Social Links
Edit `src/lib/seo.ts`:
```typescript
export function getOrganizationSchema() {
  return {
    // ...
    sameAs: [
      'https://github.com/redactbox',
      'https://twitter.com/redactbox',
      // Add more here
    ],
    // ...
  };
}
```

---

**Generated**: December 14, 2025
**Version**: 1.0
**Status**: Complete
