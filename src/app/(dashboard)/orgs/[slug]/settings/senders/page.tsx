import { notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, knownSenders } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { KnownSenderCard } from '@/components/known-senders/known-sender-card';
import { AddKnownSenderButton } from '@/components/known-senders/add-known-sender-button';
import { Database, Info } from 'lucide-react';

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

async function getKnownSenders(orgId: string) {
  return db
    .select()
    .from(knownSenders)
    .where(
      or(
        eq(knownSenders.isGlobal, true),
        eq(knownSenders.organizationId, orgId)
      )
    )
    .orderBy(knownSenders.name);
}

export default async function KnownSendersSettingsPage({ params }: PageProps) {
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
  const senders = await getKnownSenders(organization.id);

  // Cast jsonb fields to proper types
  const typedSenders = senders.map((s) => ({
    ...s,
    ipRanges: s.ipRanges as string[] | null,
    dkimDomains: s.dkimDomains as string[] | null,
  }));

  const globalSenders = typedSenders.filter((s) => s.isGlobal);
  const customSenders = typedSenders.filter((s) => !s.isGlobal);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Known Senders</h1>
        <p className="text-muted-foreground">
          Manage the database of known legitimate email senders
        </p>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            About Known Senders
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            The Known Sender Library helps you automatically identify and classify
            email sources in your DMARC reports. When a source IP address or DKIM
            domain matches a known sender, it will be automatically labeled for
            easier identification.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">How matching works:</p>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1 ml-2">
              <li>
                IP addresses are matched against the sender's IP ranges (CIDR
                notation)
              </li>
              <li>
                DKIM domains from your reports are matched against the sender's DKIM
                domain list
              </li>
              <li>
                Matches are automatically applied when new reports are imported
              </li>
              <li>
                You can create custom senders specific to your organization
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Global Senders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Global Known Senders ({globalSenders.length})
              </CardTitle>
              <CardDescription>
                Pre-configured senders available to all organizations
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {globalSenders.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No global senders yet</h3>
              <p className="text-muted-foreground">
                Global known senders will appear here once the seed data is loaded.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {globalSenders.map((sender) => (
                <KnownSenderCard
                  key={sender.id}
                  sender={sender}
                  orgSlug={slug}
                  canManage={false}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Custom Senders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Custom Known Senders ({customSenders.length})</CardTitle>
              <CardDescription>
                Organization-specific senders you've added
              </CardDescription>
            </div>
            {canManage && <AddKnownSenderButton orgSlug={slug} />}
          </div>
        </CardHeader>
        <CardContent>
          {customSenders.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No custom senders yet</h3>
              <p className="text-muted-foreground mb-4">
                Add custom senders to identify email sources specific to your
                organization.
              </p>
              {canManage && <AddKnownSenderButton orgSlug={slug} />}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {customSenders.map((sender) => (
                <KnownSenderCard
                  key={sender.id}
                  sender={sender}
                  orgSlug={slug}
                  canManage={canManage}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
