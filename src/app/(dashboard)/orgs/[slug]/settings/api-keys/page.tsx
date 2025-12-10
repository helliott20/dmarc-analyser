import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiKeysContent } from '@/components/api-keys/api-keys-content';
import { Key, Shield, Code } from 'lucide-react';

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function getOrgAndCheckAccess(slug: string, userId: string) {
  const [result] = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(organizations)
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(and(eq(organizations.slug, slug), eq(orgMembers.userId, userId)));

  return result;
}

export default async function ApiKeysPage({ params }: PageProps) {
  const { slug } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    return notFound();
  }

  const result = await getOrgAndCheckAccess(slug, session.user.id);

  if (!result) {
    return notFound();
  }

  const { organization, role } = result;
  const canManage = ['owner', 'admin'].includes(role);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">API Keys</h1>
        <p className="text-muted-foreground">
          Manage API keys for programmatic access to your DMARC data
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            API Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            API keys allow you to programmatically access your DMARC data. Use
            them to integrate with your own tools, build custom dashboards, or
            automate workflows.
          </p>

          <div className="space-y-3">
            <h4 className="text-sm font-medium">Available Scopes:</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                <strong>read:domains</strong> - View domain information and DNS records
              </li>
              <li>
                <strong>read:reports</strong> - Access DMARC aggregate and forensic reports
              </li>
              <li>
                <strong>read:sources</strong> - View email source data and classifications
              </li>
              <li>
                <strong>write:domains</strong> - Create and update domains
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2 p-3 bg-muted rounded-md">
            <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Security Best Practices</p>
              <ul className="text-muted-foreground space-y-1">
                <li>• Store API keys securely and never commit them to version control</li>
                <li>• Use the minimum required scopes for each key</li>
                <li>• Rotate keys regularly and revoke unused keys</li>
                <li>• Set expiration dates when possible</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Your API Keys
          </CardTitle>
          <CardDescription>
            Create and manage API keys for this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ApiKeysContent orgSlug={slug} canManage={canManage} />
        </CardContent>
      </Card>

      {/* Documentation */}
      <Card>
        <CardHeader>
          <CardTitle>API Documentation</CardTitle>
          <CardDescription>
            How to use your API keys to access DMARC data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Authentication</h4>
            <p className="text-sm text-muted-foreground">
              Include your API key in the Authorization header of your requests:
            </p>
            <pre className="text-xs overflow-x-auto p-4 bg-muted rounded-md border">
{`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://your-domain.com/api/orgs/${slug}/domains`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Example Endpoints</h4>
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-muted rounded-md">
                <code className="text-xs">GET /api/orgs/{slug}/domains</code>
                <p className="text-muted-foreground mt-1">List all domains</p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-xs">
                  GET /api/orgs/{slug}/domains/[domainId]/stats
                </code>
                <p className="text-muted-foreground mt-1">
                  Get statistics for a specific domain
                </p>
              </div>
              <div className="p-3 bg-muted rounded-md">
                <code className="text-xs">
                  GET /api/orgs/{slug}/domains/[domainId]/sources
                </code>
                <p className="text-muted-foreground mt-1">
                  List email sources for a domain
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
