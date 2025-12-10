# Audit Logs - Quick Start Guide

Get started with the audit logging system in 5 minutes.

## Step 1: Apply Database Migration

The audit_logs table is already in your schema. Apply the migration:

```bash
npm run db:push
```

## Step 2: View the Audit Log Page

Navigate to:
```
http://localhost:3000/orgs/{your-org-slug}/settings/audit-log
```

You should see an empty audit log page with filters.

## Step 3: Add Audit Logging to Your Endpoint

Open any API route file where you want to track actions. For example:

```typescript
// src/app/api/orgs/[slug]/your-endpoint/route.ts

import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  // ... your existing code ...

  // After successful operation, add this:
  await logAuditEvent({
    organizationId: org.id,
    userId: session.user.id,
    action: 'entity.create',        // e.g., 'domain.create', 'member.invite'
    entityType: 'entity',            // e.g., 'domain', 'member'
    entityId: newEntity.id,          // optional
    newValue: {                      // optional, any relevant data
      key: newEntity.value
    },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request)
  });

  return NextResponse.json(newEntity);
}
```

## Step 4: Test It

1. Perform an action that triggers your endpoint (e.g., create a domain)
2. Go back to the audit log page
3. You should see your event in the log!
4. Click on the row to expand and see details

## Step 5: Add More Logging

Follow the same pattern for other operations:

### Create Actions
```typescript
await logAuditEvent({
  action: 'domain.create',
  entityType: 'domain',
  newValue: { domain: 'example.com' },
  // ...
});
```

### Update Actions
```typescript
await logAuditEvent({
  action: 'settings.update',
  entityType: 'organization',
  oldValue: { timezone: 'UTC' },
  newValue: { timezone: 'America/New_York' },
  // ...
});
```

### Delete Actions
```typescript
await logAuditEvent({
  action: 'member.remove',
  entityType: 'member',
  oldValue: { email: 'user@example.com', role: 'member' },
  // ...
});
```

## Common Actions to Log

Priority actions to implement:

**High Priority:**
- ✅ `domain.create` (already done as example)
- `domain.delete`
- `domain.verify`
- `member.invite`
- `member.remove`
- `member.role_change`
- `settings.update`

**Medium Priority:**
- `gmail_account.add`
- `gmail_account.remove`
- `gmail_account.sync_start`
- `source.classify`
- `api_key.create`
- `api_key.revoke`

**Low Priority:**
- `domain.update`
- `organization.branding_update`
- `webhook.create`
- `known_sender.create`

## Action Naming Convention

Use the format: `{entityType}.{action}`

Examples:
- `domain.create`
- `member.invite`
- `settings.update`
- `gmail_account.sync_complete`

## Viewing Logs

### Web UI
- URL: `/orgs/{slug}/settings/audit-log`
- Filter by action type, entity type, or date range
- Pagination: 50 items per page
- Click rows to see full details

### API
```bash
# Get all logs
curl http://localhost:3000/api/orgs/your-org/audit-logs

# Filter by action
curl http://localhost:3000/api/orgs/your-org/audit-logs?action=domain.create

# Filter by date range
curl http://localhost:3000/api/orgs/your-org/audit-logs?fromDate=2024-01-01&toDate=2024-12-31

# Pagination
curl http://localhost:3000/api/orgs/your-org/audit-logs?page=2&pageSize=100
```

## Troubleshooting

### "No audit logs found"
- Check that you've called `logAuditEvent()` after performing an action
- Verify the database migration is applied
- Make sure you're viewing the correct organization

### Events not showing immediately
- Refresh the page (no real-time updates yet)
- Check browser console for errors
- Verify the API endpoint is returning data: `/api/orgs/{slug}/audit-logs`

### Permission denied
- Ensure you're logged in and a member of the organization
- Check session authentication is working

## What's Next?

1. **Add logging to all endpoints** - Start with high-priority actions
2. **Customize filters** - Add user filter, entity ID search, etc.
3. **Export functionality** - Add CSV/JSON export buttons
4. **Real-time updates** - Consider WebSocket integration
5. **Retention policies** - Archive logs older than X days

## Need Help?

- **Full Documentation**: See `/docs/AUDIT_LOGS.md`
- **Integration Examples**: See `/AUDIT_LOG_INTEGRATION_GUIDE.md`
- **Implementation Summary**: See `/AUDIT_LOGS_IMPLEMENTATION_SUMMARY.md`

---

That's it! You're ready to track all activities in your DMARC Analyser. 🎉
