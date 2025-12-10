'use client';

import * as React from 'react';
import { useParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Globe,
  LayoutDashboard,
  Mail,
  Settings,
  Shield,
  Users,
  FileText,
  Bell,
  Server,
  Wrench,
  LogOut,
  ChevronDown,
  Plus,
  Activity,
  Network,
  Webhook,
  CalendarClock,
  HelpCircle,
  Database,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut, useSession } from 'next-auth/react';
import { UnreadAlertsBadge } from '@/components/alerts/unread-alerts-badge';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  accentColor?: string | null;
}

interface AppSidebarProps {
  organizations?: Organization[];
  currentOrg?: Organization | null;
}

export function AppSidebar({
  organizations = [],
  currentOrg,
}: AppSidebarProps) {
  const pathname = usePathname();
  const params = useParams();
  const { data: session } = useSession();

  const user = session?.user;
  // Use URL param slug, or fall back to currentOrg slug
  const orgSlug = (params?.slug as string) || currentOrg?.slug;
  const domainId = params?.domainId as string;

  // Extract domain info from the URL if we're on a domain page
  const isDomainPage = domainId && pathname?.includes(`/domains/${domainId}`);

  const isActive = (path: string) => pathname === path;
  const isActivePrefix = (prefix: string) => pathname?.startsWith(prefix);

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <Link href="/orgs" className="flex items-center gap-2">
          {currentOrg?.logoUrl ? (
            <img
              src={currentOrg.logoUrl}
              alt={currentOrg.name}
              className="h-6 w-6 object-contain"
            />
          ) : (
            <Shield className="h-6 w-6 text-primary" />
          )}
          <span className="font-semibold text-lg">
            {currentOrg?.name || 'DMARC Analyser'}
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {/* Organization Selector */}
        {currentOrg && (
          <SidebarGroup>
            <SidebarGroupLabel>Organization</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton className="w-full justify-between">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span className="truncate">{currentOrg.name}</span>
                        </div>
                        <ChevronDown className="h-4 w-4" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="start">
                      {organizations.map((org) => (
                        <DropdownMenuItem key={org.id} asChild>
                          <Link href={`/orgs/${org.slug}`}>
                            <Building2 className="h-4 w-4 mr-2" />
                            {org.name}
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/orgs/new">
                          <Plus className="h-4 w-4 mr-2" />
                          Create Organization
                        </Link>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Main Navigation */}
        {orgSlug && (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}`)}
                    >
                      <Link href={`/orgs/${orgSlug}`}>
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={
                        isActive(`/orgs/${orgSlug}/domains`) ||
                        (pathname?.startsWith(`/orgs/${orgSlug}/domains`) && !isDomainPage)
                      }
                    >
                      <Link href={`/orgs/${orgSlug}/domains`}>
                        <Globe className="h-4 w-4" />
                        <span>Domains</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Domain Sub-Navigation (only visible when viewing a specific domain) */}
            {isDomainPage && (
              <SidebarGroup>
                <SidebarGroupLabel>Domain</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(
                          `/orgs/${orgSlug}/domains/${domainId}`
                        )}
                      >
                        <Link href={`/orgs/${orgSlug}/domains/${domainId}`}>
                          <LayoutDashboard className="h-4 w-4" />
                          <span>Overview</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(
                          `/orgs/${orgSlug}/domains/${domainId}/reports`
                        )}
                      >
                        <Link href={`/orgs/${orgSlug}/domains/${domainId}/reports`}>
                          <Mail className="h-4 w-4" />
                          <span>Reports</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(
                          `/orgs/${orgSlug}/domains/${domainId}/sources`
                        )}
                      >
                        <Link href={`/orgs/${orgSlug}/domains/${domainId}/sources`}>
                          <Server className="h-4 w-4" />
                          <span>Sources</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(
                          `/orgs/${orgSlug}/domains/${domainId}/timeline`
                        )}
                      >
                        <Link href={`/orgs/${orgSlug}/domains/${domainId}/timeline`}>
                          <Activity className="h-4 w-4" />
                          <span>Timeline</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(
                          `/orgs/${orgSlug}/domains/${domainId}/forensic`
                        )}
                      >
                        <Link href={`/orgs/${orgSlug}/domains/${domainId}/forensic`}>
                          <Shield className="h-4 w-4" />
                          <span>Forensic</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive(
                          `/orgs/${orgSlug}/domains/${domainId}/subdomains`
                        )}
                      >
                        <Link href={`/orgs/${orgSlug}/domains/${domainId}/subdomains`}>
                          <Network className="h-4 w-4" />
                          <span>Subdomains</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Alerts */}
            <SidebarGroup>
              <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/alerts`)}
                    >
                      <Link href={`/orgs/${orgSlug}/alerts`}>
                        <Bell className="h-4 w-4" />
                        <span>Alerts</span>
                      </Link>
                    </SidebarMenuButton>
                    <UnreadAlertsBadge orgSlug={orgSlug} />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Settings */}
            <SidebarGroup>
              <SidebarGroupLabel>Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings`}>
                        <Settings className="h-4 w-4" />
                        <span>General</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/team`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/team`}>
                        <Users className="h-4 w-4" />
                        <span>Team</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/gmail`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/gmail`}>
                        <Mail className="h-4 w-4" />
                        <span>Gmail</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/senders`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/senders`}>
                        <Shield className="h-4 w-4" />
                        <span>Known Senders</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/alerts`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/alerts`}>
                        <Bell className="h-4 w-4" />
                        <span>Alert Rules</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/webhooks`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/webhooks`}>
                        <Webhook className="h-4 w-4" />
                        <span>Webhooks</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/reports`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/reports`}>
                        <CalendarClock className="h-4 w-4" />
                        <span>Scheduled Reports</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/api-keys`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/api-keys`}>
                        <Server className="h-4 w-4" />
                        <span>API Keys</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/audit-log`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/audit-log`}>
                        <FileText className="h-4 w-4" />
                        <span>Audit Log</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(`/orgs/${orgSlug}/settings/data`)}
                    >
                      <Link href={`/orgs/${orgSlug}/settings/data`}>
                        <Database className="h-4 w-4" />
                        <span>Data & Export</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/tools')}>
                  <Link href="/tools">
                    <Wrench className="h-4 w-4" />
                    <span>DNS Lookup</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/tools/generator')}
                >
                  <Link href="/tools/generator">
                    <Shield className="h-4 w-4" />
                    <span>DMARC Generator</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActivePrefix('/help')}
            >
              <Link href="/help">
                <HelpCircle className="h-4 w-4" />
                <span>Help</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="w-full justify-start gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.image || ''} alt={user?.name || ''} />
                    <AvatarFallback>
                      {user?.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="truncate">{user?.name || 'User'}</span>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start" side="top">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-destructive"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
