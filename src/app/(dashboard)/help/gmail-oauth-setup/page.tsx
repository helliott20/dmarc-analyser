import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink, Info, CheckCircle2, Copy } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Gmail OAuth Setup Guide | DMARC Analyser',
  description: 'Learn how to set up Google OAuth credentials to connect your Gmail account for DMARC report collection.',
};

export default function GmailOAuthSetupPage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Gmail OAuth Setup Guide</h1>
        <p className="text-muted-foreground">
          Follow these steps to create Google OAuth credentials for connecting your Gmail account.
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          This guide is for advanced users who want to use their own Google Cloud project instead of the default central inbox.
        </AlertDescription>
      </Alert>

      {/* Prerequisites */}
      <Card>
        <CardHeader>
          <CardTitle>Prerequisites</CardTitle>
          <CardDescription>Before you begin, make sure you have:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
            <span>A Google account (Gmail or Google Workspace)</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
            <span>Access to Google Cloud Console</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
            <span>Admin or owner permissions in your DMARC Analyser organization</span>
          </div>
        </CardContent>
      </Card>

      {/* Step 1 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              1
            </div>
            <div>
              <CardTitle>Create a Google Cloud Project</CardTitle>
              <CardDescription>Set up a new project in Google Cloud Console</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              Go to the{' '}
              <a
                href="https://console.cloud.google.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Google Cloud Console
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Click the project dropdown at the top of the page</li>
            <li>Click <strong>New Project</strong></li>
            <li>Enter a project name (e.g., &quot;DMARC Reports&quot;)</li>
            <li>Click <strong>Create</strong></li>
          </ol>
        </CardContent>
      </Card>

      {/* Step 2 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              2
            </div>
            <div>
              <CardTitle>Enable the Gmail API</CardTitle>
              <CardDescription>Allow your project to access Gmail</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              In Google Cloud Console, go to{' '}
              <a
                href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                APIs &amp; Services → Library
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Search for <strong>Gmail API</strong></li>
            <li>Click on it and then click <strong>Enable</strong></li>
          </ol>
        </CardContent>
      </Card>

      {/* Step 3 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              3
            </div>
            <div>
              <CardTitle>Configure OAuth Consent Screen</CardTitle>
              <CardDescription>Set up the authorization screen users will see</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              Go to{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials/consent"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                APIs &amp; Services → OAuth consent screen
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Select <strong>Internal</strong> (for Google Workspace) or <strong>External</strong> (for personal Gmail)
            </li>
            <li>Click <strong>Create</strong></li>
            <li>Fill in the required fields:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li>App name: <code className="bg-muted px-1 rounded">DMARC Report Collector</code></li>
                <li>User support email: Your email address</li>
                <li>Developer contact email: Your email address</li>
              </ul>
            </li>
            <li>Click <strong>Save and Continue</strong></li>
            <li>On the Scopes page, click <strong>Add or Remove Scopes</strong></li>
            <li>Add these scopes:
              <ul className="list-disc list-inside ml-4 mt-2 space-y-1 font-mono text-xs">
                <li>https://www.googleapis.com/auth/gmail.readonly</li>
                <li>https://www.googleapis.com/auth/gmail.modify</li>
                <li>https://www.googleapis.com/auth/gmail.send</li>
                <li>https://www.googleapis.com/auth/userinfo.email</li>
              </ul>
            </li>
            <li>Click <strong>Save and Continue</strong></li>
            <li>If using External, add your email as a test user</li>
            <li>Click <strong>Save and Continue</strong></li>
          </ol>
        </CardContent>
      </Card>

      {/* Step 4 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              4
            </div>
            <div>
              <CardTitle>Create OAuth Credentials</CardTitle>
              <CardDescription>Generate your Client ID and Client Secret</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>
              Go to{' '}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                APIs &amp; Services → Credentials
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>Click <strong>Create Credentials</strong> → <strong>OAuth client ID</strong></li>
            <li>Select <strong>Web application</strong> as the application type</li>
            <li>Enter a name (e.g., &quot;DMARC Analyser&quot;)</li>
            <li>Under <strong>Authorized redirect URIs</strong>, add:
              <div className="mt-2 p-3 bg-slate-900 text-slate-100 rounded-lg font-mono text-sm flex items-center justify-between">
                <code>{typeof window !== 'undefined' ? window.location.origin : 'https://app.dmarcanalyser.io'}/api/gmail/callback</code>
              </div>
            </li>
            <li>Click <strong>Create</strong></li>
            <li>Copy your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
          </ol>

          <Alert className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              Keep your Client Secret secure. Never share it publicly or commit it to version control.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Step 5 */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
              5
            </div>
            <div>
              <CardTitle>Add Credentials to DMARC Analyser</CardTitle>
              <CardDescription>Configure your organization with the OAuth credentials</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="list-decimal list-inside space-y-3 text-sm">
            <li>Go to your organization&apos;s <strong>Email Import</strong> settings</li>
            <li>In the &quot;Advanced&quot; section, enable <strong>Use Custom OAuth Credentials</strong></li>
            <li>Enter your <strong>Client ID</strong> and <strong>Client Secret</strong></li>
            <li>Click <strong>Save Credentials</strong></li>
            <li>Click <strong>Connect Gmail</strong> to authorize your Gmail account</li>
          </ol>
        </CardContent>
      </Card>

      {/* Troubleshooting */}
      <Card>
        <CardHeader>
          <CardTitle>Troubleshooting</CardTitle>
          <CardDescription>Common issues and solutions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="font-medium">Error: &quot;Access blocked: This app&apos;s request is invalid&quot;</p>
              <p className="text-sm text-muted-foreground">
                Make sure the redirect URI in your Google Cloud credentials exactly matches:{' '}
                <code className="bg-muted px-1 rounded">{typeof window !== 'undefined' ? window.location.origin : 'https://app.dmarcanalyser.io'}/api/gmail/callback</code>
              </p>
            </div>
            <div>
              <p className="font-medium">Error: &quot;App not verified&quot;</p>
              <p className="text-sm text-muted-foreground">
                If using External user type, make sure you&apos;ve added your email as a test user in the OAuth consent screen settings.
              </p>
            </div>
            <div>
              <p className="font-medium">Error: &quot;Invalid Client ID format&quot;</p>
              <p className="text-sm text-muted-foreground">
                Client IDs should end with <code className="bg-muted px-1 rounded">.apps.googleusercontent.com</code>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground text-center">
        Need more help?{' '}
        <a href="mailto:support@dmarcanalyser.io" className="text-primary hover:underline">
          Contact support
        </a>
      </p>
    </div>
  );
}
