import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, aiIntegrations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Sparkles, Shield, Lock } from 'lucide-react';
import { GeminiIntegrationCard } from '@/components/integrations/gemini-integration-card';

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

async function getAiIntegration(orgId: string) {
  const [integration] = await db
    .select({
      id: aiIntegrations.id,
      isEnabled: aiIntegrations.isEnabled,
      hasApiKey: aiIntegrations.geminiApiKey,
      apiKeySetAt: aiIntegrations.geminiApiKeySetAt,
      lastUsedAt: aiIntegrations.lastUsedAt,
      usageCount24h: aiIntegrations.usageCount24h,
      usageResetAt: aiIntegrations.usageResetAt,
      lastError: aiIntegrations.lastError,
      lastErrorAt: aiIntegrations.lastErrorAt,
    })
    .from(aiIntegrations)
    .where(eq(aiIntegrations.organizationId, orgId));

  return integration;
}

export default async function IntegrationsSettingsPage({ params }: PageProps) {
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
  const integration = await getAiIntegration(organization.id);

  // Calculate usage reset time
  let usageResetsIn = null;
  if (integration?.usageResetAt) {
    const resetAt = new Date(
      integration.usageResetAt.getTime() + 24 * 60 * 60 * 1000
    );
    const now = new Date();
    if (resetAt > now) {
      usageResetsIn = Math.ceil((resetAt.getTime() - now.getTime()) / 1000);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Integrations</h1>
        <p className="text-muted-foreground">
          Connect AI services to get intelligent recommendations
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Policy Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enable AI-powered analysis to get intelligent DMARC policy
            recommendations based on your domain&apos;s email authentication
            data.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
              <Shield className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-medium">Smart Analysis</h4>
                <p className="text-xs text-muted-foreground">
                  AI analyses your pass rates, sources, and monitoring duration
                  to recommend when to upgrade your policy.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-muted rounded-md">
              <Lock className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h4 className="text-sm font-medium">Privacy First</h4>
                <p className="text-xs text-muted-foreground">
                  Only aggregated statistics are sent to the AI. No email
                  content, IP addresses, or personal data is shared.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gemini Integration */}
      <GeminiIntegrationCard
        orgSlug={slug}
        canManage={canManage}
        initialData={
          integration
            ? {
                configured: true,
                isEnabled: integration.isEnabled,
                hasApiKey: !!integration.hasApiKey,
                apiKeySetAt: integration.apiKeySetAt?.toISOString() || null,
                lastUsedAt: integration.lastUsedAt?.toISOString() || null,
                usageCount24h: integration.usageCount24h,
                usageResetsIn,
                dailyLimit: 100,
                lastError: integration.lastError,
                lastErrorAt: integration.lastErrorAt?.toISOString() || null,
              }
            : {
                configured: false,
                isEnabled: false,
                hasApiKey: false,
                usageCount24h: 0,
                dailyLimit: 100,
              }
        }
      />
    </div>
  );
}
