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
      <MultipleSchemaMarkup schemas={[getPricingSchema(), getFAQSchema()]} />
      {children}
    </>
  );
}
