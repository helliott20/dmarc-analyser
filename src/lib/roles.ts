/**
 * Role hierarchy and permission utilities for organization members
 */

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

const roleHierarchy: Record<MemberRole, number> = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Check if a role can perform actions on another role
 * @param actorRole The role performing the action
 * @param targetRole The role being acted upon
 * @returns true if actorRole has higher privileges than targetRole
 */
export function canManageRole(actorRole: MemberRole, targetRole: MemberRole): boolean {
  return roleHierarchy[actorRole] > roleHierarchy[targetRole];
}

/**
 * Check if a role can assign another role
 * @param actorRole The role doing the assignment
 * @param newRole The role being assigned
 * @returns true if actorRole can assign newRole
 */
export function canAssignRole(actorRole: MemberRole, newRole: MemberRole): boolean {
  // Can only assign roles lower than your own
  return roleHierarchy[actorRole] > roleHierarchy[newRole];
}

/**
 * Check if a user has permission to invite members
 */
export function canInviteMembers(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user has permission to remove members
 */
export function canRemoveMembers(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user has permission to change member roles
 */
export function canChangeRoles(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can view audit logs
 */
export function canViewAuditLogs(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can manage exports
 */
export function canManageExports(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can manage organisation settings
 */
export function canManageSettings(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can manage domains (add/edit/delete)
 */
export function canManageDomains(role: MemberRole): boolean {
  return ['owner', 'admin', 'member'].includes(role);
}

/**
 * Check if a user can manage webhooks
 */
export function canManageWebhooks(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can manage API keys
 */
export function canManageApiKeys(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can manage alert rules
 */
export function canManageAlertRules(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can manage Gmail accounts
 */
export function canManageGmail(role: MemberRole): boolean {
  return ['owner', 'admin'].includes(role);
}

/**
 * Check if a user can delete the organisation
 */
export function canDeleteOrganisation(role: MemberRole): boolean {
  return role === 'owner';
}

/**
 * Get all permissions for a role (useful for UI)
 */
export function getPermissions(role: MemberRole) {
  return {
    canInviteMembers: canInviteMembers(role),
    canRemoveMembers: canRemoveMembers(role),
    canChangeRoles: canChangeRoles(role),
    canViewAuditLogs: canViewAuditLogs(role),
    canManageExports: canManageExports(role),
    canManageSettings: canManageSettings(role),
    canManageDomains: canManageDomains(role),
    canManageWebhooks: canManageWebhooks(role),
    canManageApiKeys: canManageApiKeys(role),
    canManageAlertRules: canManageAlertRules(role),
    canManageGmail: canManageGmail(role),
    canDeleteOrganisation: canDeleteOrganisation(role),
    assignableRoles: getAssignableRoles(role),
  };
}

/**
 * Get all roles that a given role can assign
 */
export function getAssignableRoles(role: MemberRole): MemberRole[] {
  const currentLevel = roleHierarchy[role];
  return Object.entries(roleHierarchy)
    .filter(([_, level]) => level < currentLevel)
    .map(([roleName]) => roleName as MemberRole);
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: MemberRole): string {
  const names: Record<MemberRole, string> = {
    owner: 'Owner',
    admin: 'Admin',
    member: 'Member',
    viewer: 'Viewer',
  };
  return names[role];
}

/**
 * Get role badge variant for UI
 */
export function getRoleBadgeVariant(role: MemberRole): 'default' | 'secondary' | 'outline' | 'destructive' {
  const variants: Record<MemberRole, 'default' | 'secondary' | 'outline' | 'destructive'> = {
    owner: 'destructive',
    admin: 'default',
    member: 'secondary',
    viewer: 'outline',
  };
  return variants[role];
}

/**
 * Generate a secure random token for invitations
 */
export function generateInvitationToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Calculate invitation expiration date (7 days from now)
 */
export function getInvitationExpiry(): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);
  return expiry;
}
