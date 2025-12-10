# Webhook Integration - Quick Start Guide

## 🚀 Getting Started with Webhooks

Webhooks allow you to receive real-time notifications from the DMARC Analyser to your favorite communication platform.

## Setup Guide by Platform

### Slack Integration

1. **Create Incoming Webhook in Slack:**
   - Go to your Slack workspace
   - Navigate to: Apps → Manage → Custom Integrations → Incoming Webhooks
   - Click "Add to Slack"
   - Choose a channel
   - Copy the webhook URL (starts with `https://hooks.slack.com/services/...`)

2. **Configure in DMARC Analyser:**
   - Navigate to Settings → Webhooks
   - Click "Add Webhook"
   - Fill in:
     - **Name:** "Slack Production Alerts"
     - **Type:** Slack
     - **URL:** (paste your webhook URL)
     - **Events:** Check "Alert Created"
     - **Severity:** Select "Critical" and "Warning" (optional)
   - Click "Create Webhook"

3. **Test:**
   - Click the send icon (✉️) next to your webhook
   - Check your Slack channel for the test message

### Discord Integration

1. **Create Webhook in Discord:**
   - Open your Discord server
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Choose a channel
   - Copy the webhook URL

2. **Configure in DMARC Analyser:**
   - Navigate to Settings → Webhooks
   - Click "Add Webhook"
   - Fill in:
     - **Name:** "Discord Notifications"
     - **Type:** Discord
     - **URL:** (paste your webhook URL)
     - **Events:** Select desired events
   - Click "Create Webhook"

3. **Test:**
   - Click the send icon next to your webhook
   - Check your Discord channel

### Microsoft Teams Integration

1. **Create Incoming Webhook in Teams:**
   - Open your Teams channel
   - Click "..." → Connectors
   - Search for "Incoming Webhook"
   - Configure and copy the webhook URL

2. **Configure in DMARC Analyser:**
   - Navigate to Settings → Webhooks
   - Click "Add Webhook"
   - Fill in:
     - **Name:** "Teams Alerts"
     - **Type:** Microsoft Teams
     - **URL:** (paste your webhook URL)
     - **Events:** Select desired events
   - Click "Create Webhook"

3. **Test:**
   - Click the send icon
   - Check your Teams channel

### Custom HTTP Endpoint

1. **Prepare Your Endpoint:**
   - Ensure your endpoint accepts POST requests
   - Endpoint should return 200 OK on success
   - Implement HMAC signature verification (see below)

2. **Configure in DMARC Analyser:**
   - Navigate to Settings → Webhooks
   - Click "Add Webhook"
   - Fill in:
     - **Name:** "My Custom Integration"
     - **Type:** Custom URL
     - **URL:** https://your-server.com/webhook
     - **Events:** Select desired events
   - Click "Create Webhook"
   - **⚠️ IMPORTANT:** Copy the webhook secret (shown only once!)

3. **Implement Signature Verification:**

   **Node.js Example:**
   ```javascript
   const crypto = require('crypto');
   const express = require('express');

   app.post('/webhook', express.json(), (req, res) => {
     const signature = req.headers['x-webhook-signature'];
     const timestamp = req.headers['x-webhook-timestamp'];
     const secret = 'your-webhook-secret'; // Store securely!

     // Verify signature
     const payload = JSON.stringify(req.body);
     const hmac = crypto.createHmac('sha256', secret);
     hmac.update(payload);
     const expectedSignature = hmac.digest('hex');

     if (signature !== expectedSignature) {
       return res.status(401).send('Invalid signature');
     }

     // Process the webhook
     console.log('Webhook received:', req.body);
     res.status(200).send('OK');
   });
   ```

   **Python Example:**
   ```python
   import hmac
   import hashlib
   import json
   from flask import Flask, request

   app = Flask(__name__)

   @app.route('/webhook', methods=['POST'])
   def webhook():
       signature = request.headers.get('X-Webhook-Signature')
       timestamp = request.headers.get('X-Webhook-Timestamp')
       secret = 'your-webhook-secret'  # Store securely!

       # Verify signature
       payload = request.get_data()
       expected = hmac.new(
           secret.encode(),
           payload,
           hashlib.sha256
       ).hexdigest()

       if signature != expected:
           return 'Invalid signature', 401

       # Process webhook
       data = request.get_json()
       print('Webhook received:', data)
       return 'OK', 200
   ```

## Event Types Explained

| Event | Description | Use Case |
|-------|-------------|----------|
| **Alert Created** | Triggered when a new alert is generated | Get notified of DMARC issues immediately |
| **Report Received** | New DMARC report arrives | Track report ingestion |
| **New Source** | Email sent from a new IP | Detect potentially unauthorized senders |
| **Domain Verified** | Domain verification completes | Confirm domain setup |
| **Compliance Drop** | Authentication metrics decline | Monitor email security compliance |

## Filtering Options

### Event Filtering
Subscribe only to relevant events:
- Check only the events you want to receive
- Example: Select only "Alert Created" for critical notifications

### Severity Filtering
For alerts, filter by severity:
- **Info** - Informational notifications
- **Warning** - Potential issues
- **Critical** - Urgent problems requiring attention

Leave unchecked to receive all severities.

### Domain Filtering
Limit notifications to a specific domain:
- Select a domain from the dropdown
- Leave as "All domains" to receive notifications for all domains

## Best Practices

### 1. Start Simple
- Begin with one webhook for critical alerts only
- Test thoroughly before adding more

### 2. Use Appropriate Channels
- Create dedicated channels for alerts
- Don't spam general channels
- Use thread replies in Slack for details

### 3. Filter Wisely
- Set severity filters to avoid alert fatigue
- Use domain filters for multi-domain setups
- Subscribe only to actionable events

### 4. Monitor Webhook Health
- Check the status badge regularly
- Investigate webhooks showing "Warning" or "Failing"
- Test periodically to ensure connectivity

### 5. Secure Custom Webhooks
- Store secrets in environment variables
- Always verify HMAC signatures
- Use HTTPS endpoints only
- Implement rate limiting on your endpoint

## Troubleshooting

### Webhook Not Firing

**Check 1: Is it enabled?**
- Look for the toggle switch next to the webhook
- Ensure it's in the "on" position

**Check 2: Does the URL work?**
- Click the test button (send icon)
- Check for error messages
- Verify the URL is correct

**Check 3: Are filters blocking?**
- Check event filters
- Verify severity filter settings
- Confirm domain filter if set

### Test Message Not Received

**For Slack:**
- Verify the webhook URL is correct
- Check you selected the right channel
- Ensure the webhook hasn't been deleted in Slack

**For Discord:**
- Verify webhook wasn't deleted in Discord
- Check channel permissions
- Confirm webhook URL is complete

**For Teams:**
- Check connector is still active
- Verify channel access
- Ensure webhook URL is valid

**For Custom:**
- Check your server logs
- Verify endpoint is accessible
- Test with curl/Postman
- Check firewall rules

### "Failing" Status Badge

When you see the red "Failing" badge:

1. **Click the test button** to see the specific error
2. **Check the failure count** - multiple consecutive failures
3. **Common causes:**
   - Invalid or expired webhook URL
   - Endpoint is down or unreachable
   - Timeout (endpoint taking >10 seconds)
   - Authentication issues (custom webhooks)

4. **Resolution:**
   - Update the webhook URL if changed
   - Fix endpoint issues
   - Delete and recreate if URL expired
   - Check signature verification (custom)

## Sample Payloads

### Slack Message Example
```
━━━━━━━━━━━━━━━━━━━━━━
Alert: Pass Rate Drop Detected
━━━━━━━━━━━━━━━━━━━━━━

Domain: example.com
Severity: 🔴 CRITICAL

Dec 10, 2024 at 10:30 AM
```

### Discord Embed Example
```
🔴 Alert: Pass Rate Drop Detected

Authentication pass rate has dropped below threshold

Domain: example.com
Severity: CRITICAL

DMARC Analyser • Dec 10, 2024 at 10:30 AM
```

### Custom JSON Payload Example
```json
{
  "event": "alert.created",
  "timestamp": "2024-12-10T10:30:00.000Z",
  "organizationId": "uuid",
  "data": {
    "title": "Pass Rate Drop Detected",
    "message": "Authentication pass rate has dropped below threshold",
    "severity": "critical",
    "domain": "example.com",
    "type": "pass_rate_drop",
    "passRate": 75,
    "previousRate": 95
  }
}
```

## Managing Webhooks

### Update a Webhook
Currently, to update a webhook:
1. Note your webhook settings
2. Delete the existing webhook
3. Create a new webhook with updated settings

### Disable Temporarily
- Use the toggle switch to disable without deleting
- Useful for maintenance or testing

### Delete a Webhook
- Click the trash icon
- Confirm the deletion
- This action cannot be undone

## Security Notes

### ⚠️ For Custom Webhooks

1. **Save the secret immediately** - It's shown only once!
2. **Store securely** - Use environment variables or secret management
3. **Verify signatures** - Always validate HMAC signatures
4. **Use HTTPS** - Never use HTTP endpoints
5. **Implement timeouts** - Respond quickly (under 10 seconds)
6. **Log failures** - Track webhook delivery issues

### 🔒 Access Control

- Only organization owners and admins can:
  - Create webhooks
  - Modify webhooks
  - Delete webhooks
  - Test webhooks
- All webhook operations are logged in the audit log

## Getting Help

If you encounter issues:

1. Check this guide first
2. Test the webhook using the test button
3. Review error messages carefully
4. Check the audit log for webhook operations
5. Verify your endpoint is accessible
6. Review the full documentation in WEBHOOK_INTEGRATION_GUIDE.md

## Next Steps

After setting up your first webhook:

1. ✅ Test it works correctly
2. ✅ Set up webhooks for other channels
3. ✅ Configure appropriate filters
4. ✅ Monitor webhook health regularly
5. ✅ Review and adjust based on your needs

Happy monitoring! 🎉
