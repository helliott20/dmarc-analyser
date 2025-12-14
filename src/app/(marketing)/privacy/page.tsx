import { Metadata } from 'next';
import Link from 'next/link';
import { PRODUCT } from '@/lib/config';

export const metadata: Metadata = {
  title: `Privacy Policy - ${PRODUCT.name}`,
  description: `Privacy Policy for ${PRODUCT.name} by ${PRODUCT.company}`,
};

export default function PrivacyPage() {
  const lastUpdated = '14 December 2024';

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <h1>Privacy Policy</h1>
        <p className="text-muted-foreground">Last updated: {lastUpdated}</p>

        <section>
          <h2>1. Introduction</h2>
          <p>
            {PRODUCT.company} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates {PRODUCT.name} (&quot;Service&quot;).
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
          </p>
          <p>
            We are committed to protecting your privacy and handling your data in an open and transparent manner.
            By using our Service, you agree to the collection and use of information in accordance with this policy.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>

          <h3>2.1 Account Information</h3>
          <p>When you create an account using Google OAuth, we collect:</p>
          <ul>
            <li>Your name</li>
            <li>Email address</li>
            <li>Google account ID</li>
            <li>Profile picture (if available)</li>
          </ul>

          <h3>2.2 Organisation Data</h3>
          <p>When you create or join an organisation, we collect:</p>
          <ul>
            <li>Organisation name</li>
            <li>Domain names you add for monitoring</li>
            <li>Team member information</li>
            <li>Billing information (processed by Stripe)</li>
          </ul>

          <h3>2.3 DMARC Report Data</h3>
          <p>When you connect Gmail or upload reports, we process:</p>
          <ul>
            <li>DMARC aggregate reports (XML data)</li>
            <li>Sender IP addresses</li>
            <li>Email volume statistics</li>
            <li>SPF/DKIM/DMARC authentication results</li>
          </ul>
          <p>
            <strong>Important:</strong> We do not access or store the content of your personal emails.
            We only process DMARC report emails which contain technical authentication data, not message content.
          </p>

          <h3>2.4 Usage Data</h3>
          <p>We automatically collect certain information when you use the Service:</p>
          <ul>
            <li>IP address</li>
            <li>Browser type and version</li>
            <li>Pages visited and features used</li>
            <li>Time and date of access</li>
            <li>Device information</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the collected information to:</p>
          <ul>
            <li>Provide and maintain the Service</li>
            <li>Process and analyse DMARC reports</li>
            <li>Send alerts and notifications you have configured</li>
            <li>Generate scheduled reports</li>
            <li>Process payments and manage subscriptions</li>
            <li>Respond to your enquiries and support requests</li>
            <li>Improve and optimise the Service</li>
            <li>Detect and prevent fraud or abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>4. Data Storage and Security</h2>

          <h3>4.1 Data Location</h3>
          <p>
            Your data is stored on secure servers. We use industry-standard cloud infrastructure providers
            with data centres that comply with relevant security certifications.
          </p>

          <h3>4.2 Security Measures</h3>
          <p>We implement appropriate technical and organisational measures to protect your data, including:</p>
          <ul>
            <li>Encryption of data in transit (TLS/HTTPS)</li>
            <li>Encryption of data at rest</li>
            <li>Regular security assessments</li>
            <li>Access controls and authentication</li>
            <li>Secure coding practices</li>
          </ul>

          <h3>4.3 Data Retention</h3>
          <p>
            We retain your data for as long as your account is active or as needed to provide the Service.
            DMARC report data is retained according to your organisation&apos;s settings. You can request
            deletion of your data at any time.
          </p>
        </section>

        <section>
          <h2>5. Data Sharing</h2>
          <p>We do not sell your personal data. We may share your information with:</p>

          <h3>5.1 Service Providers</h3>
          <ul>
            <li><strong>Stripe:</strong> Payment processing</li>
            <li><strong>Google:</strong> Authentication and Gmail API</li>
            <li><strong>Cloud providers:</strong> Infrastructure and hosting</li>
          </ul>

          <h3>5.2 Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or governmental authority,
            or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
          </p>

          <h3>5.3 Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, or sale of assets, your data may be transferred to the
            acquiring entity. We will notify you of any such change.
          </p>
        </section>

        <section>
          <h2>6. Google API Services</h2>
          <p>
            Our use of information received from Google APIs adheres to the{' '}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements.
          </p>
          <p>
            When you connect your Gmail account, we request the following permissions:
          </p>
          <ul>
            <li><strong>Read emails:</strong> To identify and import DMARC report emails</li>
            <li><strong>Modify emails:</strong> To mark imported reports as read</li>
            <li><strong>Send emails:</strong> To send alerts and reports on your behalf</li>
          </ul>
          <p>
            You can revoke Gmail access at any time from your{' '}
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Google Account permissions
            </a>
            .
          </p>
        </section>

        <section>
          <h2>7. Cookies and Tracking</h2>
          <p>We use essential cookies to:</p>
          <ul>
            <li>Maintain your session and authentication state</li>
            <li>Remember your preferences</li>
            <li>Ensure security of the Service</li>
          </ul>
          <p>
            We do not use third-party advertising cookies or tracking pixels.
          </p>
        </section>

        <section>
          <h2>8. Your Rights</h2>
          <p>Under applicable data protection laws, you have the right to:</p>
          <ul>
            <li><strong>Access:</strong> Request a copy of your personal data</li>
            <li><strong>Rectification:</strong> Request correction of inaccurate data</li>
            <li><strong>Erasure:</strong> Request deletion of your data</li>
            <li><strong>Portability:</strong> Request your data in a machine-readable format</li>
            <li><strong>Objection:</strong> Object to certain processing of your data</li>
            <li><strong>Restriction:</strong> Request restriction of processing</li>
            <li><strong>Withdraw consent:</strong> Withdraw consent at any time</li>
          </ul>
          <p>
            To exercise these rights, contact us at privacy@redactbox.co.uk.
          </p>
        </section>

        <section>
          <h2>9. International Transfers</h2>
          <p>
            Your data may be transferred to and processed in countries outside your country of residence.
            We ensure appropriate safeguards are in place to protect your data in accordance with this
            Privacy Policy and applicable law.
          </p>
        </section>

        <section>
          <h2>10. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for use by anyone under the age of 16. We do not knowingly collect
            personal data from children. If we become aware that we have collected data from a child,
            we will delete it promptly.
          </p>
        </section>

        <section>
          <h2>11. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material changes
            by email or through the Service. Your continued use of the Service after such modifications
            constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>12. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please contact us at:
          </p>
          <p>
            {PRODUCT.company}<br />
            Data Protection Enquiries<br />
            Email: privacy@redactbox.co.uk<br />
            Website: <a href={PRODUCT.companyUrl} className="text-primary hover:underline">{PRODUCT.companyUrl}</a>
          </p>
        </section>

        <section>
          <h2>13. Supervisory Authority</h2>
          <p>
            If you are in the UK or EU and believe we have not adequately addressed your concerns,
            you have the right to lodge a complaint with a supervisory authority. In the UK, this is the
            Information Commissioner&apos;s Office (ICO) at{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              ico.org.uk
            </a>.
          </p>
        </section>
      </div>
    </div>
  );
}
