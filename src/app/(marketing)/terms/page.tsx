import { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT } from '@/lib/config';

export const metadata: Metadata = {
  title: `Terms of Service - ${PRODUCT.name}`,
  description: `Terms of Service for ${PRODUCT.name} by ${PRODUCT.company}`,
};

export default function TermsPage() {
  const lastUpdated = '14 December 2024';

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Terms of Service</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using {PRODUCT.name} (&quot;Service&quot;), operated by {PRODUCT.company} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;),
            you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            {PRODUCT.name} is a DMARC monitoring and email authentication analytics platform that helps organisations
            monitor their email authentication status, analyse DMARC reports, and protect their email reputation.
          </p>
        </section>

        <section>
          <h2>3. Account Registration</h2>
          <p>
            To use the Service, you must create an account using Google OAuth authentication. You agree to:
          </p>
          <ul>
            <li>Provide accurate and complete information</li>
            <li>Maintain the security of your account credentials</li>
            <li>Promptly notify us of any unauthorised access</li>
            <li>Accept responsibility for all activities under your account</li>
          </ul>
        </section>

        <section>
          <h2>4. Subscription and Billing</h2>
          <h3>4.1 Free Trial</h3>
          <p>
            New accounts receive a 14-day free trial with full access to all features. No credit card is required during the trial period.
          </p>

          <h3>4.2 Subscription Fees</h3>
          <p>
            After the trial period, continued use of the Service requires a paid subscription. Fees are charged monthly
            based on the number of domains you monitor. Current pricing is available on our pricing page.
          </p>

          <h3>4.3 Payment</h3>
          <p>
            Payments are processed securely through Stripe. By subscribing, you authorise us to charge your payment
            method on a recurring monthly basis until you cancel.
          </p>

          <h3>4.4 Cancellation</h3>
          <p>
            You may cancel your subscription at any time through your account settings. Your access will continue
            until the end of the current billing period. We do not provide refunds for partial months.
          </p>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>Use the Service for any illegal purpose</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Interfere with or disrupt the Service</li>
            <li>Attempt to gain unauthorised access to the Service or its systems</li>
            <li>Use the Service to send spam or malicious content</li>
            <li>Resell or redistribute the Service without permission</li>
            <li>Use automated scripts to access the Service without our consent</li>
          </ul>
        </section>

        <section>
          <h2>6. Data and Privacy</h2>
          <p>
            Your use of the Service is subject to our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>,
            which describes how we collect, use, and protect your data.
          </p>
          <p>
            You retain ownership of all data you provide to the Service. We process your data solely to provide
            and improve the Service.
          </p>
        </section>

        <section>
          <h2>7. Gmail Integration</h2>
          <p>
            If you choose to connect your Gmail account, you grant us permission to:
          </p>
          <ul>
            <li>Access and read DMARC report emails</li>
            <li>Mark imported emails as read</li>
            <li>Send emails on your behalf (for alerts and reports)</li>
          </ul>
          <p>
            We only access emails matching DMARC report patterns and do not read your personal correspondence.
          </p>
        </section>

        <section>
          <h2>8. Intellectual Property</h2>
          <p>
            The Service, including its design, code, and content, is owned by {PRODUCT.company} and protected by
            intellectual property laws. You may not copy, modify, or distribute any part of the Service without permission.
          </p>
          <p>
            {PRODUCT.name} is open source software. The source code is available under the terms specified in its repository license.
          </p>
        </section>

        <section>
          <h2>9. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY,
            FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>
          <p>
            We do not guarantee that the Service will be uninterrupted, secure, or error-free.
          </p>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {PRODUCT.company.toUpperCase()} SHALL NOT BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES,
            WHETHER INCURRED DIRECTLY OR INDIRECTLY.
          </p>
          <p>
            Our total liability for any claims arising from your use of the Service shall not exceed the amount
            you paid us in the twelve months preceding the claim.
          </p>
        </section>

        <section>
          <h2>11. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless {PRODUCT.company} and its officers, directors, employees,
            and agents from any claims, damages, losses, or expenses arising from your use of the Service or
            violation of these Terms.
          </p>
        </section>

        <section>
          <h2>12. Modifications to Terms</h2>
          <p>
            We may modify these Terms at any time. We will notify you of significant changes by email or through
            the Service. Your continued use of the Service after such modifications constitutes acceptance of
            the updated Terms.
          </p>
        </section>

        <section>
          <h2>13. Termination</h2>
          <p>
            We may suspend or terminate your access to the Service at any time for violation of these Terms or
            for any other reason at our discretion. Upon termination, your right to use the Service ceases immediately.
          </p>
        </section>

        <section>
          <h2>14. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of England and Wales,
            without regard to conflict of law principles. Any disputes shall be resolved in the courts of England and Wales.
          </p>
        </section>

        <section>
          <h2>15. Contact Us</h2>
          <p>
            If you have any questions about these Terms, please contact us at:
          </p>
          <p>
            {PRODUCT.company}<br />
            Email: legal@redactbox.co.uk<br />
            Website: <a href={PRODUCT.companyUrl} className="text-primary hover:underline">{PRODUCT.companyUrl}</a>
          </p>
        </section>
      </div>
    </div>
  );
}
