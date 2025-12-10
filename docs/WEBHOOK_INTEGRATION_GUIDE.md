# Webhook Integration Guide

## Overview

The Webhook Integration feature allows organizations to receive real-time notifications about events in the DMARC analyzer. Webhooks can be configured to send notifications to Slack, Discord, Microsoft Teams, or custom HTTP endpoints.

## Features

### Supported Platforms

1. **Slack** - Send formatted messages with blocks to Slack channels
2. **Discord** - Post rich embeds to Discord channels
3. **Microsoft Teams** - Send adaptive cards to Teams channels
4. **Custom URL** - Send JSON payloads to any HTTP endpoint with HMAC signatures

### Event Types

The following events can be subscribed to:

- `alert.created` - Triggered when a new alert is created
- `report.received` - Notifies when a new DMARC report arrives
- `source.new` - Alerts when email is sent from a new IP address
- `domain.verified` - Triggered when a domain is verified
- `compliance.drop` - Notifies when compliance metrics drop below threshold

### Filtering Options

Webhooks can be filtered by:

1. **Event Type** - Subscribe to specific events only
2. **Severity** - Filter alerts by severity (info, warning, critical)
3. **Domain** - Receive notifications for a specific domain only

## Database Schema

The `webhooks` table has been enhanced with the following structure:

```sql
CREATE TABLE webhooks (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Webhook Configuration
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL, -- 'slack', 'discord', 'teams', 'custom'
  url TEXT NOT NULL,
  secret VARCHAR(64), -- For custom webhooks, HMAC signing

  -- Event Filters
  events TEXT NOT NULL, -- JSON array: ['alert.created', 'report.received', 'source.new']
  severity_filter TEXT, -- JSON array: ['critical', 'warning'] or null for all
  domain_filter UUID REFERENCES domains(id), -- null = all domains

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP,
  failure_count INTEGER DEFAULT 0,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### List Webhooks
```
GET /api/orgs/{slug}/webhooks
```

Returns all webhooks for the organization (secrets are masked).

### Create Webhook
```
POST /api/orgs/{slug}/webhooks
```

**Request Body:**
```json
{
  "name": "My Slack Webhook",
  "type": "slack",
  "url": "https://hooks.slack.com/services/...",
  "events": ["alert.created", "report.received"],
  "severityFilter": ["critical", "warning"],
  "domainFilter": "uuid-of-domain" // optional
}
```

**Response:**
```json
{
  "id": "uuid",
  "name": "My Slack Webhook",
  "type": "slack",
  "url": "https://hooks.slack.com/services/...",
  "secret": "abc123..." // Only returned once for custom webhooks
  // ... other fields
}
```

### Update Webhook
```
PATCH /api/orgs/{slug}/webhooks/{webhookId}
```

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Name",
  "url": "https://new-url.com",
  "events": ["alert.created"],
  "isActive": true
}
```

### Delete Webhook
```
DELETE /api/orgs/{slug}/webhooks/{webhookId}
```

### Test Webhook
```
POST /api/orgs/{slug}/webhooks/{webhookId}/test
```

Sends a test payload to verify the webhook is working correctly.

## Webhook Payload Formats

### Slack

Slack webhooks receive formatted messages using blocks:

```json
{
  "attachments": [
    {
      "color": "#DC2626",
      "blocks": [
        {
          "type": "header",
          "text": {
            "type": "plain_text",
            "text": "Alert: Pass Rate Drop Detected"
          }
        },
        {
          "type": "section",
          "fields": [
            {
              "type": "mrkdwn",
              "text": "*Domain:*\nexample.com"
            },
            {
              "type": "mrkdwn",
              "text": "*Severity:*\n:red_circle: CRITICAL"
            }
          ]
        }
      ]
    }
  ]
}
```

### Discord

Discord webhooks receive rich embeds:

```json
{
  "embeds": [
    {
      "title": "Alert: Pass Rate Drop Detected",
      "description": "Authentication pass rate has dropped below threshold",
      "color": 14423100,
      "fields": [
        {
          "name": "Domain",
          "value": "example.com",
          "inline": true
        },
        {
          "name": "Severity",
          "value": "CRITICAL",
          "inline": true
        }
      ],
      "timestamp": "2024-01-01T00:00:00.000Z",
      "footer": {
        "text": "DMARC Analyser"
      }
    }
  ]
}
```

### Microsoft Teams

Teams webhooks receive MessageCard format:

```json
{
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": "Alert: Pass Rate Drop Detected",
  "themeColor": "DC2626",
  "title": "Alert: Pass Rate Drop Detected",
  "text": "Authentication pass rate has dropped below threshold",
  "sections": [
    {
      "facts": [
        {
          "name": "Domain",
          "value": "example.com"
        },
        {
          "name": "Severity",
          "value": "CRITICAL"
        }
      ]
    }
  ]
}
```

### Custom Webhooks

Custom webhooks receive the raw event payload:

```json
{
  "event": "alert.created",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "organizationId": "uuid",
  "data": {
    "title": "Pass Rate Drop Detected",
    "message": "Authentication pass rate has dropped below threshold",
    "severity": "critical",
    "domain": "example.com",
    "type": "pass_rate_drop"
  }
}
```

**Security Headers:**

Custom webhooks include HMAC signatures for verification:

```
X-Webhook-Signature: sha256=abc123...
X-Webhook-Timestamp: 1234567890000
Content-Type: application/json
User-Agent: DMARC-Analyzer-Webhook/1.0
```

**Verifying Signatures:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest('hex');
  return signature === expectedSignature;
}

// Usage
const isValid = verifyWebhookSignature(
  JSON.stringify(request.body),
  request.headers['x-webhook-signature'],
  webhookSecret
);
```

## Usage Example

### Creating a Slack Webhook

1. Go to your Slack workspace and create an incoming webhook
2. Copy the webhook URL
3. In DMARC Analyser, navigate to Settings > Webhooks
4. Click "Add Webhook"
5. Fill in the form:
   - Name: "Production Alerts"
   - Type: Slack
   - URL: Your Slack webhook URL
   - Events: Select "Alert Created"
   - Severity Filter: Select "Critical" and "Warning"
6. Click "Create Webhook"
7. Test the webhook by clicking the send icon

### Creating a Custom Webhook

1. Navigate to Settings > Webhooks
2. Click "Add Webhook"
3. Fill in the form:
   - Name: "My Custom Integration"
   - Type: Custom URL
   - URL: https://your-server.com/webhook
   - Events: Select desired events
4. Click "Create Webhook"
5. **IMPORTANT:** Copy the webhook secret (shown only once!)
6. Implement webhook verification in your endpoint (see example above)

## UI Components

### WebhookManager Component

Located at: `/src/components/webhooks/webhook-manager.tsx`

This React component provides:
- List of configured webhooks with status indicators
- Create webhook dialog with validation
- Test webhook functionality
- Enable/disable webhooks
- Delete webhooks
- Secret display (one-time for custom webhooks)

### Settings Page

Located at: `/src/app/(dashboard)/orgs/[slug]/settings/webhooks/page.tsx`

Provides:
- Informational card about webhooks
- Access control (admin/owner only)
- Integration with WebhookManager component

## Webhook Library

Located at: `/src/lib/webhooks.ts`

Key functions:

- `sendWebhook(type, url, payload, secret)` - Send a webhook
- `testWebhook(type, url, secret)` - Send a test webhook
- `formatSlackPayload(payload)` - Format for Slack
- `formatDiscordPayload(payload)` - Format for Discord
- `formatTeamsPayload(payload)` - Format for Teams
- `formatCustomPayload(payload)` - Format for custom endpoints
- `generateWebhookSignature(payload, secret)` - Generate HMAC signature

## Status Indicators

Webhooks display status badges:

- **Active** (Green) - Working normally, no recent failures
- **Warning** (Yellow) - 1-5 recent failures
- **Failing** (Red) - More than 5 consecutive failures
- **Disabled** (Gray) - Webhook is turned off

## Error Handling

- Webhooks have a 10-second timeout
- Failed webhooks increment the failure counter
- Successful webhooks reset the failure counter to 0
- Failed test webhooks return error messages for debugging

## Security Considerations

1. **Custom Webhooks:**
   - Always verify HMAC signatures
   - Store secrets securely
   - Use HTTPS endpoints only

2. **Access Control:**
   - Only organization owners and admins can manage webhooks
   - All webhook operations are logged in the audit log

3. **Rate Limiting:**
   - Consider implementing rate limiting on webhook endpoints
   - Webhooks have built-in timeout protection

## Testing

Use the test button in the UI to send a sample payload:

```json
{
  "event": "webhook.test",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "organizationId": "test",
  "data": {
    "message": "This is a test webhook from DMARC Analyser",
    "severity": "info",
    "domain": "example.com",
    "type": "test"
  }
}
```

## Troubleshooting

### Webhook Not Firing

1. Check if the webhook is enabled (toggle switch)
2. Verify the URL is correct
3. Check the failure count - high failures may indicate URL issues
4. Use the test button to verify connectivity
5. Check your endpoint logs for incoming requests

### Invalid Signature (Custom Webhooks)

1. Ensure you're using the correct secret
2. Verify you're hashing the raw request body
3. Check the signature format matches (sha256 hex digest)
4. Ensure timestamp is included in verification

### Formatting Issues

1. For Slack/Discord/Teams, verify the URL is correct
2. Test with a simple message first
3. Check platform-specific webhook documentation
4. Use the test endpoint to validate format

## Migration

To apply the database changes, run:

```bash
# Using Drizzle migrations
npm run db:migrate

# Or apply manually
psql -d your_database -f drizzle/0003_add_webhook_fields.sql
```

## Future Enhancements

Potential improvements:

1. Webhook retry logic with exponential backoff
2. Webhook delivery history and logs
3. Custom template support for messages
4. Batch webhook sending for multiple events
5. Webhook status monitoring dashboard
6. More platform integrations (PagerDuty, Opsgenie, etc.)
