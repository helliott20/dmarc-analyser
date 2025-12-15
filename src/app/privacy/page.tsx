import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `Privacy Policy for ${PRODUCT.name}`,
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <Link href="/login" className="text-primary hover:underline">
            &larr; Back to Login
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <h2>1. Introduction</h2>
          <p>
            {PRODUCT.name} (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, and safeguard your information when you use our service.
          </p>

          <h2>2. Information We Collect</h2>
          <p>We collect information you provide directly to us:</p>
          <ul>
            <li>Account information (email, name) via Google OAuth</li>
            <li>DMARC report data sent to your configured email address</li>
            <li>Domain configuration and settings</li>
            <li>Usage data and analytics</li>
          </ul>

          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process and analyze your DMARC reports</li>
            <li>Send you alerts and notifications you&apos;ve configured</li>
            <li>Respond to your requests and support needs</li>
          </ul>

          <h2>4. Data Security</h2>
          <p>
            We implement appropriate security measures to protect your personal information.
            Your data is encrypted in transit and at rest. We use secure OAuth authentication
            and do not store your Google password.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide
            you services. You can request deletion of your data at any time by contacting us
            or deleting your account.
          </p>

          <h2>6. Third-Party Services</h2>
          <p>We may use third-party services that collect, monitor, and analyze data:</p>
          <ul>
            <li>Google OAuth for authentication</li>
            <li>Gmail API for fetching DMARC reports (with your permission)</li>
            <li>Stripe for payment processing (if applicable)</li>
          </ul>

          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal data</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Export your data</li>
            <li>Withdraw consent at any time</li>
          </ul>

          <h2>8. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us at{' '}
            <a href={`mailto:privacy@${PRODUCT.name.toLowerCase().replace(/\s+/g, '')}.io`} className="text-primary hover:underline">
              privacy@dmarcanalyser.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
