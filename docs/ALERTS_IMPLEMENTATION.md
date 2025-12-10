# Alerts System Implementation

This document describes the complete implementation of the Alerts system for the DMARC Analyser application.

## Overview

The Alerts system provides real-time monitoring and notifications for important events and anomalies in DMARC reports, including:

- Pass rate drops
- New email sources
- DMARC failure spikes
- DNS record changes
- Authentication failure spikes
- Policy changes
- Compliance drops

## Database Schema Changes

### 1. Alert Type Enum Updates

Updated the `alert_type` enum to include all required alert types:

```sql
-- Updated enum values:
'pass_rate_drop', 'new_source', 'dmarc_failure_spike', 'dns_change',
'auth_failure_spike', 'policy_change', 'compliance_drop'
```

### 2. Alerts Table Enhancements

Added dismissal functionality to the `alerts` table:

```sql
ALTER TABLE alerts ADD COLUMN is_dismissed BOOLEAN DEFAULT false NOT NULL;
ALTER TABLE alerts ADD COLUMN dismissed_by UUID REFERENCES users(id);
ALTER TABLE alerts ADD COLUMN dismissed_at TIMESTAMP;
```

### 3. New Alert Rules Table

Created the `alert_rules` table for configurable alert thresholds:

```sql
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  domain_id UUID REFERENCES domains(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  threshold JSONB,
  is_enabled BOOLEAN DEFAULT true NOT NULL,
  notify_email BOOLEAN DEFAULT true NOT NULL,
  notify_webhook BOOLEAN DEFAULT false NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX alert_rules_org_idx ON alert_rules(organization_id);
CREATE INDEX alert_rules_domain_idx ON alert_rules(domain_id);
CREATE INDEX alert_rules_enabled_idx ON alert_rules(is_enabled);
```

## API Endpoints

### Alerts API

#### GET `/api/orgs/[slug]/alerts`

List alerts with filtering and pagination.

**Query Parameters:**
- `type` - Filter by alert type
- `severity` - Filter by severity (info, warning, critical)
- `read` - Filter by read status (true/false)
- `dismissed` - Filter by dismissed status (true/false)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 50)

**Response:**
```json
{
  "alerts": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "pages": 2
  },
  "unreadCount": 5
}
```

#### PATCH `/api/orgs/[slug]/alerts/[id]`

Mark an alert as read.

**Request Body:**
```json
{
  "isRead": true
}
```

#### POST `/api/orgs/[slug]/alerts/[id]/dismiss`

Dismiss an alert (also marks it as read).

### Alert Rules API

#### GET `/api/orgs/[slug]/alert-rules`

List all alert rules for the organization.

**Query Parameters:**
- `domainId` - Filter by domain (returns domain-specific + org-wide rules)

#### POST `/api/orgs/[slug]/alert-rules`

Create a new alert rule.

**Request Body:**
```json
{
  "domainId": "uuid-or-null",
  "type": "pass_rate_drop",
  "threshold": {
    "passRate": 90,
    "period": "24h"
  },
  "isEnabled": true,
  "notifyEmail": true,
  "notifyWebhook": false
}
```

**Permissions:** Owner or Admin only

#### PATCH `/api/orgs/[slug]/alert-rules/[id]`

Update an existing alert rule.

**Request Body:**
```json
{
  "threshold": { "passRate": 85 },
  "isEnabled": false,
  "notifyEmail": true,
  "notifyWebhook": true
}
```

**Permissions:** Owner or Admin only

#### DELETE `/api/orgs/[slug]/alert-rules/[id]`

Delete an alert rule.

**Permissions:** Owner or Admin only

## UI Components

### Pages

#### `/orgs/[slug]/alerts`

Main alerts page showing:
- Alert statistics (unread, critical, warning, info counts)
- Filterable list of alerts
- Mark as read / dismiss actions
- Link to alert rules configuration

#### `/orgs/[slug]/settings/alerts`

Alert rules management page allowing:
- Creating new alert rules
- Configuring thresholds for different alert types
- Enabling/disabling rules
- Setting notification preferences (email, webhook)
- Deleting rules

### Components

#### `<AlertsList>` (`/src/components/alerts/alerts-list.tsx`)

Client component that:
- Displays alerts with filtering
- Shows alert severity, type, and metadata
- Provides actions to mark as read or dismiss
- Real-time updates on filter changes

#### `<AlertRulesManager>` (`/src/components/alerts/alert-rules-manager.tsx`)

Client component that:
- Lists all alert rules
- Provides dialog to create new rules
- Allows toggling rules on/off
- Supports rule deletion
- Configures thresholds per alert type

#### `<UnreadAlertsBadge>` (`/src/components/alerts/unread-alerts-badge.tsx`)

Client component that:
- Shows unread alert count in sidebar
- Polls for updates every 30 seconds
- Displays badge only when count > 0

### Sidebar Integration

Updated the app sidebar to:
- Display "Alerts" menu item with unread count badge
- Added "Alert Rules" under Settings section
- Badge shows red notification for unread alerts

## Alert Types and Thresholds

### Pass Rate Drop
**Type:** `pass_rate_drop`
**Threshold Format:**
```json
{
  "passRate": 90,
  "period": "24h"
}
```
Triggers when authentication pass rate falls below the threshold percentage.

### New Source
**Type:** `new_source`
**Threshold:** None (alerts on any new IP)
Triggers when email is received from a previously unseen IP address.

### DMARC Failure Spike
**Type:** `dmarc_failure_spike`
**Threshold Format:**
```json
{
  "increasePercent": 50,
  "period": "1h"
}
```
Triggers when DMARC failures increase by the specified percentage.

### DNS Change
**Type:** `dns_change`
**Threshold:** None
Triggers when DMARC or SPF DNS records are modified.

### Auth Failure Spike
**Type:** `auth_failure_spike`
**Threshold Format:**
```json
{
  "increasePercent": 50,
  "period": "1h"
}
```
Triggers when SPF/DKIM authentication failures spike.

### Policy Change
**Type:** `policy_change`
**Threshold:** None
Triggers when DMARC policy (p= tag) changes.

### Compliance Drop
**Type:** `compliance_drop`
**Threshold Format:**
```json
{
  "passRate": 95,
  "period": "24h"
}
```
Triggers when overall compliance metrics drop below threshold.

## Database Migration

To apply the schema changes:

```bash
# Generate migration
npx drizzle-kit generate

# Apply migration
npx drizzle-kit push

# Or apply migrations in production
npx drizzle-kit migrate
```

The migration will:
1. Update the `alert_type` enum
2. Add dismissal columns to `alerts` table
3. Create the `alert_rules` table with indexes
4. Add necessary foreign key relations

## File Structure

```
src/
├── app/
│   ├── api/
│   │   └── orgs/
│   │       └── [slug]/
│   │           ├── alerts/
│   │           │   ├── route.ts (GET)
│   │           │   └── [id]/
│   │           │       ├── route.ts (PATCH)
│   │           │       └── dismiss/
│   │           │           └── route.ts (POST)
│   │           └── alert-rules/
│   │               ├── route.ts (GET, POST)
│   │               └── [id]/
│   │                   └── route.ts (PATCH, DELETE)
│   └── (dashboard)/
│       └── orgs/
│           └── [slug]/
│               ├── alerts/
│               │   └── page.tsx
│               └── settings/
│                   └── alerts/
│                       └── page.tsx
├── components/
│   ├── alerts/
│   │   ├── alerts-list.tsx
│   │   ├── alert-rules-manager.tsx
│   │   └── unread-alerts-badge.tsx
│   └── dashboard/
│       └── app-sidebar.tsx (updated)
└── db/
    └── schema.ts (updated)
```

## Testing the Implementation

### 1. Test Alert Creation (Manual via SQL)

```sql
-- Create a test alert
INSERT INTO alerts (
  organization_id,
  domain_id,
  type,
  severity,
  title,
  message,
  metadata
) VALUES (
  'your-org-id',
  'your-domain-id',
  'pass_rate_drop',
  'warning',
  'Pass Rate Dropped',
  'Authentication pass rate has dropped to 85% (below threshold of 90%)',
  '{"previousRate": 95, "currentRate": 85, "threshold": 90}'::jsonb
);
```

### 2. Test Alert Rules

1. Navigate to `/orgs/[slug]/settings/alerts`
2. Click "Add Rule"
3. Configure a pass rate drop alert with 90% threshold
4. Verify rule appears in the list
5. Toggle the rule on/off
6. Delete the test rule

### 3. Test Alerts Page

1. Navigate to `/orgs/[slug]/alerts`
2. Verify stats cards display correctly
3. Test filtering by type, severity, read status
4. Mark an alert as read
5. Dismiss an alert
6. Verify unread count updates in sidebar

## Future Enhancements

1. **Email Notifications**: Implement email sending when alerts are created
2. **Webhook Integration**: POST alerts to configured webhook URLs
3. **Alert History**: Add analytics/charts for alert trends
4. **Bulk Actions**: Mark all as read, dismiss multiple alerts
5. **Alert Grouping**: Group similar alerts together
6. **Snooze Functionality**: Temporarily silence specific alert types
7. **Custom Severity Rules**: Allow users to configure severity per rule
8. **Alert Templates**: Pre-configured rule sets for common scenarios

## Notes

- Alert rules can be organization-wide (domainId = null) or domain-specific
- Dismissing an alert automatically marks it as read
- The unread count badge polls every 30 seconds for updates
- All alert management actions require authentication
- Creating/updating/deleting rules requires Owner or Admin role
- Alert metadata is stored as JSONB for flexible data structures
