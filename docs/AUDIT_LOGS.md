# Audit Logs System

Complete audit logging system for tracking all organizational activities in the DMARC Analyzer.

## Overview

The audit logging system provides:
- Comprehensive activity tracking across the application
- Filterable log viewer with advanced search capabilities
- Detailed change tracking with old/new value diffs
- User attribution with IP address and user agent tracking
- RESTful API for programmatic access

## Architecture

### Components

1. **Database Schema** (`/src/db/schema.ts`)
   - `audit_logs` table with proper indexing
   - Stores all audit events with full context

2. **Utility Functions** (`/src/lib/audit.ts`)
   - `logAuditEvent()` - Main function to log audit events
   - `getClientIp()` - Extract client IP from request headers
   - `getUserAgent()` - Extract user agent from request headers

3. **API Endpoint** (`/src/app/api/orgs/[slug]/audit-logs/route.ts`)
   - GET endpoint with filtering, pagination, and sorting
   - Returns logs with joined user information

4. **UI Page** (`/src/app/(dashboard)/orgs/[slug]/settings/audit-log/page.tsx`)
   - Interactive log viewer with filters
   - Expandable rows showing detailed information
   - Date range filtering
   - Real-time pagination

## Features

### Filtering
- By action type (create, update, delete, etc.)
- By entity type (domain, member, settings, etc.)
- By date range (from/to dates)
- By user (future enhancement)

### Log Details
Each audit log entry contains:
- Timestamp (with timezone)
- User (name, email, avatar)
- Action performed
- Entity type and ID
- Old and new values (JSON diff)
- IP address
- User agent string

### Expandable Rows
Click any log entry to view:
- Full metadata (IP, user agent)
- Side-by-side JSON comparison of changes
- Complete context of the action

## API Reference

### GET `/api/orgs/[slug]/audit-logs`

Fetch audit logs for an organization.

**Query Parameters:**
- `page` (number, default: 1) - Page number
- `pageSize` (number, default: 50) - Items per page
- `action` (string, optional) - Filter by action name
- `entityType` (string, optional) - Filter by entity type
- `userId` (string, optional) - Filter by user ID
- `fromDate` (string, optional) - ISO 8601 date string
- `toDate` (string, optional) - ISO 8601 date string

**Response:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "userImage": "https://...",
      "action": "domain.create",
      "entityType": "domain",
      "entityId": "uuid",
      "oldValue": null,
      "newValue": {"domain": "example.com"},
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

## Usage Example

```typescript
import { logAuditEvent, getClientIp, getUserAgent } from '@/lib/audit';

// In your API route handler
export async function POST(request: Request) {
  const session = await auth();

  // ... your business logic ...
  const newDomain = await createDomain(data);

  // Log the audit event
  await logAuditEvent({
    organizationId: org.id,
    userId: session.user.id,
    action: 'domain.create',
    entityType: 'domain',
    entityId: newDomain.id,
    newValue: { domain: newDomain.domain },
    ipAddress: getClientIp(request),
    userAgent: getUserAgent(request)
  });

  return NextResponse.json(newDomain);
}
```

## Action Naming Convention

Follow the pattern: `{entityType}.{action}`

**Standard Actions:**
- `*.create` - Entity creation
- `*.update` - Entity modification
- `*.delete` - Entity deletion
- `*.verify` - Verification actions
- `*.sync` - Synchronization operations

**Examples:**
- `domain.create`
- `member.invite`
- `member.role_change`
- `settings.update`
- `gmail_account.add`
- `gmail_account.sync_start`
- `domain.verify`

## Security Considerations

1. **Immutable Logs**: Audit logs should never be modified or deleted
2. **Access Control**: Only organization members can view logs
3. **Sensitive Data**: Be careful about logging PII in oldValue/newValue
4. **IP Privacy**: IP addresses are stored for security purposes only
5. **Retention**: Consider implementing automatic archival of old logs

## Performance

### Indexing
The audit_logs table has indexes on:
- `organization_id` - For org-scoped queries
- `user_id` - For user activity tracking
- `action` - For action-based filtering
- `created_at` - For chronological ordering

### Optimization Tips
1. Use pagination (default 50 items per page)
2. Apply filters to reduce result sets
3. Archive old logs periodically (e.g., after 90 days)
4. Consider partitioning by date for very large datasets

## Future Enhancements

Potential improvements:
- [ ] Export logs to CSV/JSON
- [ ] Real-time log streaming via WebSockets
- [ ] Advanced search with full-text search
- [ ] Log retention policies with automatic archival
- [ ] Anomaly detection and alerts
- [ ] User activity summaries and reports
- [ ] Compliance reporting (SOC2, GDPR, etc.)

## Testing

To test the audit logging system:

1. Navigate to `/orgs/{your-org}/settings/audit-log`
2. Perform actions in your application (create domain, update settings, etc.)
3. Refresh the audit log page to see new entries
4. Test filters and pagination
5. Expand rows to view detailed information

## Database Migration

The audit_logs table is included in the initial migration:
`drizzle/0000_orange_joshua_kane.sql`

To apply migrations:
```bash
npm run db:push
```

## Troubleshooting

**Logs not appearing:**
- Verify audit logging is called after successful operations
- Check database connection
- Ensure migration has been applied

**Performance issues:**
- Add more specific filters
- Reduce page size
- Check database indexes

**Permission errors:**
- Verify user is a member of the organization
- Check session authentication

## Support

For questions or issues with the audit logging system, please refer to:
- Integration guide: `/AUDIT_LOG_INTEGRATION_GUIDE.md`
- Database schema: `/src/db/schema.ts`
- Example implementation: Look for `logAuditEvent` usage in the codebase
