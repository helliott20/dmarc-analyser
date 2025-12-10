import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, domains } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Building2, Globe, Plus } from 'lucide-react';

async function getUserOrganizations(userId: string) {
  const memberships = await db
    .select({
      organization: organizations,
      role: orgMembers.role,
    })
    .from(orgMembers)
    .innerJoin(organizations, eq(orgMembers.organizationId, organizations.id))
    .where(eq(orgMembers.userId, userId));

  // Get domain count for each org
  const orgsWithDomains = await Promise.all(
    memberships.map(async (m) => {
      const domainCount = await db
        .select({ count: count() })
        .from(domains)
        .where(eq(domains.organizationId, m.organization.id));

      return {
        ...m.organization,
        role: m.role,
        domainCount: domainCount[0]?.count || 0,
      };
    })
  );

  return orgsWithDomains;
}

export default async function OrganizationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const userOrgs = await getUserOrganizations(session.user.id);

  // If user has only one org, redirect to it
  if (userOrgs.length === 1) {
    redirect(`/orgs/${userOrgs[0].slug}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Select an organization or create a new one
          </p>
        </div>
        <Button asChild>
          <Link href="/orgs/new">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Link>
        </Button>
      </div>

      {userOrgs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No organizations yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first organization to start monitoring your domains.
            </p>
            <Button asChild>
              <Link href="/orgs/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {userOrgs.map((org) => (
            <Link key={org.id} href={`/orgs/${org.slug}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{org.name}</CardTitle>
                      <CardDescription className="capitalize">
                        {org.role}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      <span>
                        {org.domainCount}{' '}
                        {org.domainCount === 1 ? 'domain' : 'domains'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
