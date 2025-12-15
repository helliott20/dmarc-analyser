import type { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `Terms of Service for ${PRODUCT.name}`,
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <div className="mb-8">
          <Link href="/login" className="text-primary hover:underline">
            &larr; Back to Login
          </Link>
        </div>

        <h1 className="text-4xl font-bold mb-8">Terms of Service</h1>

        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <p className="text-muted-foreground mb-6">
            Last updated: {new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using {PRODUCT.name}, you agree to be bound by these Terms of Service.
            If you do not agree to these terms, please do not use our service.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            {PRODUCT.name} provides DMARC report monitoring, analysis, and alerting services.
            We help you understand your email authentication status and protect your domain
            from spoofing and phishing attacks.
          </p>

          <h2>3. User Accounts</h2>
          <p>You are responsible for:</p>
          <ul>
            <li>Maintaining the security of your account</li>
            <li>All activities that occur under your account</li>
            <li>Ensuring your contact information is accurate</li>
          </ul>

          <h2>4. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the service for any unlawful purpose</li>
            <li>Attempt to gain unauthorized access to our systems</li>
            <li>Interfere with or disrupt the service</li>
            <li>Upload malicious content or code</li>
          </ul>

          <h2>5. Data and Privacy</h2>
          <p>
            Your use of the service is also governed by our{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            You retain ownership of your data and can export or delete it at any time.
          </p>

          <h2>6. Service Availability</h2>
          <p>
            We strive to maintain high availability but do not guarantee uninterrupted access.
            We may modify, suspend, or discontinue any aspect of the service at any time.
          </p>

          <h2>7. Limitation of Liability</h2>
          <p>
            {PRODUCT.name} is provided &quot;as is&quot; without warranties of any kind.
            We shall not be liable for any indirect, incidental, special, or consequential damages
            arising from your use of the service.
          </p>

          <h2>8. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. We will notify you of significant changes
            by posting a notice on our service or sending you an email.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These terms shall be governed by and construed in accordance with the laws of
            England and Wales, without regard to its conflict of law provisions.
          </p>

          <h2>10. Contact</h2>
          <p>
            For questions about these Terms of Service, please contact us at{' '}
            <a href="mailto:legal@dmarcanalyser.io" className="text-primary hover:underline">
              legal@dmarcanalyser.io
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
