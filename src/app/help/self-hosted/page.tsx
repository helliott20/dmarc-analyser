import Link from 'next/link';
import {
  HardDrive,
  Key,
  Database,
  Mail,
  Shield,
  Terminal,
  ExternalLink,
  Copy,
  ArrowRight,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const sections = [
  { id: 'prerequisites', title: 'Prerequisites' },
  { id: 'google-oauth', title: 'Google OAuth Setup' },
  { id: 'gmail-api', title: 'Gmail API Setup' },
  { id: 'gemini-api', title: 'Gemini API Setup (Optional)' },
  { id: 'environment', title: 'Environment Variables' },
  { id: 'docker', title: 'Running with Docker' },
];

export default function SelfHostedPage() {
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
          <BreadcrumbPage>Self-Hosted Setup</BreadcrumbPage>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <HardDrive className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Self-Hosted Setup Guide</h1>
        </div>
        <p className="text-xl text-muted-foreground">
          Deploy your own DMARC Analyser instance with full control over your data
        </p>
      </div>

      {/* Table of Contents */}
      <Card>
        <CardHeader>
          <CardTitle>On This Page</CardTitle>
        </CardHeader>
        <CardContent>
          <nav className="space-y-2">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {section.title}
              </a>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Prerequisites */}
      <section id="prerequisites" className="scroll-mt-8 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Terminal className="h-6 w-6 text-primary" />
          Prerequisites
        </h2>
        <Card>
          <CardContent className="pt-6">
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Docker & Docker Compose</p>
                  <p className="text-sm text-muted-foreground">Required for running the application containers</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">PostgreSQL Database</p>
                  <p className="text-sm text-muted-foreground">Can be self-hosted or use a managed service like Neon, Supabase, or AWS RDS</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Google Cloud Account</p>
                  <p className="text-sm text-muted-foreground">Required for OAuth authentication and Gmail API access</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">4</span>
                </div>
                <div>
                  <p className="font-medium">Domain with HTTPS</p>
                  <p className="text-sm text-muted-foreground">Google OAuth requires HTTPS in production</p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Google OAuth Setup */}
      <section id="google-oauth" className="scroll-mt-8 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Key className="h-6 w-6 text-primary" />
          Google OAuth Setup
        </h2>
        <p className="text-muted-foreground">
          Google OAuth is used for user authentication. Follow these steps to create OAuth credentials:
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Create a Google Cloud Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">1.</span>
                <span>
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
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">2.</span>
                <span>Click the project dropdown at the top and select &quot;New Project&quot;</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">3.</span>
                <span>Enter a project name (e.g., &quot;DMARC Analyser&quot;) and click &quot;Create&quot;</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Configure OAuth Consent Screen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">1.</span>
                <span>
                  Navigate to{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials/consent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    APIs & Services → OAuth consent screen
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">2.</span>
                <span>Select &quot;External&quot; user type (unless you have Google Workspace)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">3.</span>
                <span>Fill in the required fields:</span>
              </li>
            </ol>
            <div className="ml-8 space-y-2 text-sm bg-muted/50 rounded-lg p-4">
              <p><strong>App name:</strong> DMARC Analyser</p>
              <p><strong>User support email:</strong> your-email@example.com</p>
              <p><strong>Developer contact:</strong> your-email@example.com</p>
            </div>
            <ol className="space-y-3 text-sm" start={4}>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">4.</span>
                <span>Click &quot;Save and Continue&quot; through the Scopes and Test Users sections</span>
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3: Create OAuth Credentials</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">1.</span>
                <span>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    APIs & Services → Credentials
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">2.</span>
                <span>Click &quot;Create Credentials&quot; → &quot;OAuth client ID&quot;</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">3.</span>
                <span>Select &quot;Web application&quot; as the application type</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">4.</span>
                <span>Add Authorized redirect URIs:</span>
              </li>
            </ol>
            <div className="ml-8 space-y-2">
              <code className="block text-sm bg-muted p-3 rounded-lg font-mono">
                https://your-domain.com/api/auth/callback/google
              </code>
              <p className="text-xs text-muted-foreground">For local development, also add:</p>
              <code className="block text-sm bg-muted p-3 rounded-lg font-mono">
                http://localhost:3000/api/auth/callback/google
              </code>
            </div>
            <ol className="space-y-3 text-sm" start={5}>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">5.</span>
                <span>Click &quot;Create&quot; and copy your <strong>Client ID</strong> and <strong>Client Secret</strong></span>
              </li>
            </ol>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertTitle>Keep your credentials secure</AlertTitle>
              <AlertDescription>
                Never commit your Client Secret to version control. Use environment variables.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Gmail API Setup */}
      <section id="gmail-api" className="scroll-mt-8 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Mail className="h-6 w-6 text-primary" />
          Gmail API Setup
        </h2>
        <p className="text-muted-foreground">
          The Gmail API allows automatic import of DMARC reports from Gmail accounts.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Enable Gmail API</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">1.</span>
                <span>
                  Go to{' '}
                  <a
                    href="https://console.cloud.google.com/apis/library/gmail.googleapis.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Gmail API in the API Library
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">2.</span>
                <span>Click &quot;Enable&quot; to enable the Gmail API for your project</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">3.</span>
                <span>Return to the OAuth consent screen and add the following scopes:</span>
              </li>
            </ol>
            <div className="ml-8 space-y-2 text-sm bg-muted/50 rounded-lg p-4 font-mono">
              <p>https://www.googleapis.com/auth/gmail.readonly</p>
              <p>https://www.googleapis.com/auth/gmail.modify</p>
              <p>https://www.googleapis.com/auth/gmail.send</p>
            </div>
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Important: App Verification</AlertTitle>
              <AlertDescription>
                For production use with external users, you&apos;ll need to verify your app with Google.
                This requires a privacy policy and may take several weeks. During development, you can
                add test users in the OAuth consent screen.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </section>

      {/* Gemini API Setup */}
      <section id="gemini-api" className="scroll-mt-8 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          Gemini API Setup (Optional)
        </h2>
        <p className="text-muted-foreground">
          Google Gemini powers the AI recommendations feature. This is optional but recommended.
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Get Gemini API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">1.</span>
                <span>
                  Go to{' '}
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Google AI Studio
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">2.</span>
                <span>Click &quot;Create API Key&quot;</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="font-medium text-muted-foreground">3.</span>
                <span>Copy the API key for use in your environment variables</span>
              </li>
            </ol>
            <p className="text-sm text-muted-foreground">
              The free tier includes generous usage limits suitable for most self-hosted deployments.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Environment Variables */}
      <section id="environment" className="scroll-mt-8 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          Environment Variables
        </h2>
        <p className="text-muted-foreground">
          Create a <code className="bg-muted px-1 rounded">.env</code> file with the following variables:
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              Required Environment Variables
              <Copy className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto font-mono">
{`# Database
DATABASE_URL="postgresql://user:password@host:5432/dmarc_analyser"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-a-random-32-char-string"

# Google OAuth (from Step 3 above)
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# Gemini AI (optional)
GEMINI_API_KEY="your-gemini-api-key"

# App Mode (leave unset for self-hosted)
# SAAS_MODE="true"  # Only set for SaaS deployment`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generate NEXTAUTH_SECRET</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Run this command to generate a secure secret:</p>
            <code className="block text-sm bg-muted p-3 rounded-lg font-mono">
              openssl rand -base64 32
            </code>
          </CardContent>
        </Card>
      </section>

      {/* Docker Setup */}
      <section id="docker" className="scroll-mt-8 space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <HardDrive className="h-6 w-6 text-primary" />
          Running with Docker
        </h2>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Docker Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clone the repository and start the application:
            </p>
            <pre className="text-sm bg-muted p-4 rounded-lg overflow-x-auto font-mono">
{`# Clone the repository
git clone https://github.com/helliott20/dmarc-analyser.git
cd dmarc-analyzer

# Copy environment file
cp .env.example .env
# Edit .env with your values

# Start the application
docker compose up -d

# Run database migrations
docker compose exec app npm run db:migrate`}
            </pre>
            <p className="text-sm text-muted-foreground">
              The application will be available at <code className="bg-muted px-1 rounded">http://localhost:3000</code>
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Next Steps */}
      <div className="space-y-4 pt-8">
        <h2 className="text-2xl font-bold">Next Steps</h2>
        <p className="text-muted-foreground">
          Once your instance is running, continue with:
        </p>
        <div className="grid gap-4">
          <Link href="/help/getting-started">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Getting Started Guide</CardTitle>
                    <CardDescription>Set up your first organization and domain</CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/help/troubleshooting">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Troubleshooting</CardTitle>
                    <CardDescription>Common issues and solutions</CardDescription>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}
