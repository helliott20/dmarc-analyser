import crypto from 'crypto';

export type WebhookType = 'slack' | 'discord' | 'teams' | 'custom';

export interface WebhookPayload {
  event: string;
  timestamp: string;
  organizationId: string;
  data: any;
}

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
  fields?: Array<{
    type: string;
    text: string;
  }>;
  accessory?: any;
}

/**
 * Generate HMAC signature for webhook payload
 */
export function generateWebhookSignature(
  payload: string,
  secret: string
): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Format payload for Slack webhook
 */
export function formatSlackPayload(payload: WebhookPayload): object {
  const { event, data } = payload;

  // Determine color based on severity or event type
  let color = '#0066CC'; // Default blue
  if (data.severity === 'critical') color = '#DC2626'; // Red
  else if (data.severity === 'warning') color = '#F59E0B'; // Orange
  else if (data.severity === 'info') color = '#3B82F6'; // Blue

  // Build blocks based on event type
  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: getEventTitle(event, data),
      },
    },
    {
      type: 'section',
      fields: getEventFields(event, data),
    },
  ];

  // Add context with timestamp
  blocks.push({
    type: 'context',
    text: {
      type: 'mrkdwn',
      text: `<!date^${Math.floor(Date.now() / 1000)}^{date_num} at {time_secs}|${new Date().toISOString()}>`,
    },
  });

  return {
    attachments: [
      {
        color,
        blocks,
      },
    ],
  };
}

/**
 * Format payload for Discord webhook
 */
export function formatDiscordPayload(payload: WebhookPayload): object {
  const { event, data } = payload;

  // Determine color based on severity or event type
  let color = 3447003; // Default blue
  if (data.severity === 'critical') color = 14423100; // Red
  else if (data.severity === 'warning') color = 16098851; // Orange
  else if (data.severity === 'info') color = 3901635; // Green

  // Build embed fields
  const fields = getEventFields(event, data).map((field: any) => {
    const text = field.text.replace(/\*/g, '**'); // Convert markdown
    const [name, value] = text.split('\n');
    return {
      name: name || 'Info',
      value: value || text,
      inline: true,
    };
  });

  return {
    embeds: [
      {
        title: getEventTitle(event, data),
        description: data.message || data.description,
        color,
        fields,
        timestamp: new Date().toISOString(),
        footer: {
          text: 'DMARC Analyser',
        },
      },
    ],
  };
}

/**
 * Format payload for Microsoft Teams webhook
 */
export function formatTeamsPayload(payload: WebhookPayload): object {
  const { event, data } = payload;

  // Determine color based on severity
  let themeColor = '0066CC'; // Default blue
  if (data.severity === 'critical') themeColor = 'DC2626'; // Red
  else if (data.severity === 'warning') themeColor = 'F59E0B'; // Orange
  else if (data.severity === 'info') themeColor = '3B82F6'; // Blue

  // Build facts (fields)
  const facts = getEventFields(event, data).map((field: any) => {
    const text = field.text;
    const [name, value] = text.split('\n');
    return {
      name: name?.replace(/\*/g, '') || 'Info',
      value: value?.replace(/\*/g, '') || text.replace(/\*/g, ''),
    };
  });

  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: getEventTitle(event, data),
    themeColor,
    title: getEventTitle(event, data),
    text: data.message || data.description,
    sections: [
      {
        facts,
      },
    ],
  };
}

/**
 * Format payload for custom webhook (generic JSON)
 */
export function formatCustomPayload(payload: WebhookPayload): object {
  return payload;
}

/**
 * Get event title based on event type
 */
function getEventTitle(event: string, data: any): string {
  switch (event) {
    case 'alert.created':
      return `Alert: ${data.title || 'New Alert'}`;
    case 'report.received':
      return `New DMARC Report Received`;
    case 'source.new':
      return `New Email Source Detected`;
    case 'domain.verified':
      return `Domain Verified`;
    case 'compliance.drop':
      return `Compliance Drop Detected`;
    default:
      return `DMARC Event: ${event}`;
  }
}

/**
 * Get event fields based on event type
 */
function getEventFields(event: string, data: any): any[] {
  const fields = [];

  // Common fields
  if (data.domain) {
    fields.push({
      type: 'mrkdwn',
      text: `*Domain:*\n${data.domain}`,
    });
  }

  if (data.severity) {
    const severityEmoji =
      data.severity === 'critical'
        ? ':red_circle:'
        : data.severity === 'warning'
        ? ':orange_circle:'
        : ':large_blue_circle:';
    fields.push({
      type: 'mrkdwn',
      text: `*Severity:*\n${severityEmoji} ${data.severity.toUpperCase()}`,
    });
  }

  // Event-specific fields
  switch (event) {
    case 'alert.created':
      if (data.type) {
        fields.push({
          type: 'mrkdwn',
          text: `*Type:*\n${data.type}`,
        });
      }
      break;

    case 'report.received':
      if (data.reportId) {
        fields.push({
          type: 'mrkdwn',
          text: `*Report ID:*\n${data.reportId}`,
        });
      }
      if (data.orgName) {
        fields.push({
          type: 'mrkdwn',
          text: `*Reporter:*\n${data.orgName}`,
        });
      }
      if (data.messageCount) {
        fields.push({
          type: 'mrkdwn',
          text: `*Messages:*\n${data.messageCount}`,
        });
      }
      break;

    case 'source.new':
      if (data.sourceIp) {
        fields.push({
          type: 'mrkdwn',
          text: `*IP Address:*\n${data.sourceIp}`,
        });
      }
      if (data.organization) {
        fields.push({
          type: 'mrkdwn',
          text: `*Organization:*\n${data.organization}`,
        });
      }
      if (data.country) {
        fields.push({
          type: 'mrkdwn',
          text: `*Location:*\n${data.country}`,
        });
      }
      break;

    case 'compliance.drop':
      if (data.passRate !== undefined) {
        fields.push({
          type: 'mrkdwn',
          text: `*Pass Rate:*\n${data.passRate}%`,
        });
      }
      if (data.previousRate !== undefined) {
        fields.push({
          type: 'mrkdwn',
          text: `*Previous:*\n${data.previousRate}%`,
        });
      }
      break;
  }

  return fields;
}

/**
 * Send webhook to the specified URL
 */
export async function sendWebhook(
  type: WebhookType,
  url: string,
  payload: WebhookPayload,
  secret?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Format payload based on webhook type
    let formattedPayload: object;
    switch (type) {
      case 'slack':
        formattedPayload = formatSlackPayload(payload);
        break;
      case 'discord':
        formattedPayload = formatDiscordPayload(payload);
        break;
      case 'teams':
        formattedPayload = formatTeamsPayload(payload);
        break;
      case 'custom':
      default:
        formattedPayload = formatCustomPayload(payload);
        break;
    }

    const body = JSON.stringify(formattedPayload);

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'DMARC-Analyzer-Webhook/1.0',
    };

    // Add signature for custom webhooks
    if (type === 'custom' && secret) {
      const signature = generateWebhookSignature(body, secret);
      headers['X-Webhook-Signature'] = signature;
      headers['X-Webhook-Timestamp'] = Date.now().toString();
    }

    // Send webhook
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to send webhook',
    };
  }
}

/**
 * Test webhook by sending a sample payload
 */
export async function testWebhook(
  type: WebhookType,
  url: string,
  secret?: string
): Promise<{ success: boolean; error?: string }> {
  const testPayload: WebhookPayload = {
    event: 'webhook.test',
    timestamp: new Date().toISOString(),
    organizationId: 'test',
    data: {
      message: 'This is a test webhook from DMARC Analyser',
      severity: 'info',
      domain: 'example.com',
      type: 'test',
    },
  };

  return sendWebhook(type, url, testPayload, secret);
}
