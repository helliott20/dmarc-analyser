# Audit Log Integration Guide

This guide shows how to integrate audit logging into your API endpoints.

## Overview

The audit logging system has been implemented with:

1. **Database Table**: `audit_logs` table (already migrated)
2. **Utility Functions**: `/src/lib/audit.ts` - Helper functions for logging events
3. **API Endpoint**: `/api/orgs/[slug]/audit-logs` - Fetch audit logs with filtering
4. **UI Page**: `/orgs/[slug]/settings/audit-log` - View and filter audit logs

## Integration Examples

### 1. Basic Usage

```typescript
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  // ... your code here ...

  // Log the audit event
  await logAuditEvent({
    organizationId: membership.organization.id,
    userId: session.user.id,
    action: 'domain.create',
    entityType: 'domain',
    entityId: newDomain.id,
    newValue: {
      domain: newDomain.domain,
      displayName: newDomain.displayName
    },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request)
  });

  return NextResponse.json(newDomain);
}
```

### 2. Update Actions (with old and new values)

```typescript
export async function PATCH(request: Request, { params }: RouteParams) {
  // ... fetch existing entity ...
  const oldSettings = { ...organization };

  // ... update entity ...

  await logAuditEvent({
    organizationId: organization.id,
    userId: session.user.id,
    action: 'settings.update',
    entityType: 'organization',
    entityId: organization.id,
    oldValue: {
      timezone: oldSettings.timezone,
      dataRetentionDays: oldSettings.dataRetentionDays
    },
    newValue: {
      timezone: updatedOrg.timezone,
      dataRetentionDays: updatedOrg.dataRetentionDays
    },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request)
  });
}
```

### 3. Delete Actions

```typescript
export async function DELETE(request: Request, { params }: RouteParams) {
  // ... fetch entity to delete ...

  await logAuditEvent({
    organizationId: membership.organization.id,
    userId: session.user.id,
    action: 'domain.delete',
    entityType: 'domain',
    entityId: domainId,
    oldValue: {
      domain: domain.domain,
      displayName: domain.displayName
    },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request)
  });

  // ... delete entity ...
}
```

## Action Naming Convention

Use dot notation with the following pattern: `{entityType}.{action}`

### Recommended Actions:

- **Create**: `domain.create`, `member.invite`, `gmail_account.add`
- **Read**: Generally not logged (too verbose)
- **Update**: `settings.update`, `domain.update`, `member.role_change`
- **Delete**: `domain.delete`, `member.remove`, `gmail_account.remove`
- **Authentication**: `user.login`, `user.logout`, `user.login_failed`
- **Sync**: `gmail.sync_start`, `gmail.sync_complete`, `gmail.sync_failed`
- **Verification**: `domain.verify`, `domain.verify_failed`

## Entity Types

Common entity types:
- `domain`
- `member`
- `organization`
- `settings`
- `gmail_account`
- `report`
- `source`
- `known_sender`
- `api_key`
- `webhook`

## Example Integration in Existing Endpoints

### Domain Creation (`/api/orgs/[slug]/domains/route.ts`)

```typescript
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membership = await getOrgAndCheckAccess(slug, session.user.id, [
      'owner',
      'admin',
      'member',
    ]);

    if (!membership) {
      return NextResponse.json(
        { error: 'Organization not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { domain, displayName } = await request.json();

    if (!domain) {
      return NextResponse.json(
        { error: 'Domain is required' },
        { status: 400 }
      );
    }

    // Check if domain already exists
    const existing = await db
      .select()
      .from(domains)
      .where(
        and(
          eq(domains.organizationId, membership.organization.id),
          eq(domains.domain, domain.toLowerCase())
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'This domain is already added to your organization' },
        { status: 400 }
      );
    }

    // Generate verification token
    const verificationToken = `dmarc-verify-${randomBytes(16).toString('hex')}`;

    // Create domain
    const [newDomain] = await db
      .insert(domains)
      .values({
        organizationId: membership.organization.id,
        domain: domain.toLowerCase(),
        displayName: displayName || null,
        verificationToken,
        verificationMethod: 'dns_txt',
      })
      .returning();

    // ✅ Log audit event
    await logAuditEvent({
      organizationId: membership.organization.id,
      userId: session.user.id,
      action: 'domain.create',
      entityType: 'domain',
      entityId: newDomain.id,
      newValue: {
        domain: newDomain.domain,
        displayName: newDomain.displayName,
      },
      ipAddress: getClientIp(request),
      userAgent: getUserAgent(request),
    });

    return NextResponse.json(newDomain);
  } catch (error) {
    console.error('Failed to create domain:', error);
    return NextResponse.json(
      { error: 'Failed to create domain' },
      { status: 500 }
    );
  }
}
```

### Gmail Account Sync (`/api/orgs/[slug]/gmail/[accountId]/sync/route.ts`)

```typescript
// Start sync
await logAuditEvent({
  organizationId: membership.organization.id,
  userId: session.user.id,
  action: 'gmail.sync_start',
  entityType: 'gmail_account',
  entityId: accountId,
  newValue: {
    email: account.email,
  },
  ipAddress: getClientIp(request),
  userAgent: getUserAgent(request),
});

// ... sync logic ...

// Complete sync
await logAuditEvent({
  organizationId: membership.organization.id,
  userId: session.user.id,
  action: 'gmail.sync_complete',
  entityType: 'gmail_account',
  entityId: accountId,
  newValue: {
    email: account.email,
    reportsImported: stats.imported,
  },
  ipAddress: getClientIp(request),
  userAgent: getUserAgent(request),
});
```

## Accessing Audit Logs

### Via UI

Navigate to: `/orgs/{your-org-slug}/settings/audit-log`

Features:
- Filter by action type
- Filter by entity type
- Filter by date range
- Expandable rows showing old/new values
- Pagination support

### Via API

```typescript
GET /api/orgs/{slug}/audit-logs?page=1&pageSize=50&action=domain.create&entityType=domain&fromDate=2024-01-01&toDate=2024-12-31
```

Query parameters:
- `page`: Page number (default: 1)
- `pageSize`: Items per page (default: 50)
- `action`: Filter by action name
- `entityType`: Filter by entity type
- `userId`: Filter by user ID
- `fromDate`: Start date (ISO 8601)
- `toDate`: End date (ISO 8601)

## Database Schema

The `audit_logs` table structure:

```sql
CREATE TABLE "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "user_id" uuid,
  "action" varchar(100) NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" uuid,
  "old_value" jsonb,
  "new_value" jsonb,
  "ip_address" varchar(45),
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);
```

Indexes:
- `audit_logs_org_idx` on `organization_id`
- `audit_logs_user_idx` on `user_id`
- `audit_logs_action_idx` on `action`
- `audit_logs_created_idx` on `created_at`

## Best Practices

1. **Always log sensitive operations**: Domain verification, member role changes, settings updates
2. **Don't log read operations**: Avoid logging every GET request to prevent log bloat
3. **Include relevant context**: Use oldValue and newValue for updates
4. **Consistent action naming**: Follow the `{entityType}.{action}` pattern
5. **Graceful failure**: Audit logging failures should not break your application
6. **Privacy considerations**: Be careful about logging sensitive data in oldValue/newValue

## Migration Status

The `audit_logs` table is already included in the initial migration file:
`drizzle/0000_orange_joshua_kane.sql`

If you haven't run migrations yet, execute:

```bash
npm run db:push
# or
npm run db:migrate
```

## Next Steps

1. Add audit logging to your existing API endpoints following the examples above
2. Test the audit log page at `/orgs/{slug}/settings/audit-log`
3. Consider adding more filters or export functionality as needed
4. Set up data retention policies for audit logs (e.g., keep for 90 days)

## Troubleshooting

### Logs not appearing
- Ensure the database migration has been run
- Check that `logAuditEvent()` is being called after successful operations
- Verify the organizationId matches the organization you're viewing logs for

### Permission errors
- Only organization members can view audit logs
- Check that the user has access to the organization

### Performance concerns
- Audit logs are indexed on key columns for fast queries
- Consider archiving old logs if the table grows too large
- The API endpoint uses pagination to handle large datasets
