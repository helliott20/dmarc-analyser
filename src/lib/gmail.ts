import { db } from '@/db';
import { gmailAccounts, organizations } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { decryptIfEncrypted } from '@/lib/encryption';

const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify', // For marking messages as read and applying labels
  'https://www.googleapis.com/auth/gmail.send', // For sending emails (alerts, scheduled reports)
  'https://www.googleapis.com/auth/userinfo.email', // To get the user's email address
];

// Default OAuth credentials (from environment)
const DEFAULT_CLIENT_ID = process.env.GMAIL_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
const DEFAULT_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;

// Interface for custom OAuth credentials
export interface OAuthCredentials {
  clientId: string;
  clientSecret: string;
}

/**
 * Get OAuth credentials for an organization
 * If the org has BYOC enabled, use their credentials; otherwise use defaults
 */
export async function getOrgOAuthCredentials(orgId: string): Promise<OAuthCredentials | null> {
  const [org] = await db
    .select({
      useCustomOauth: organizations.useCustomOauth,
      googleClientId: organizations.googleClientId,
      googleClientSecret: organizations.googleClientSecret,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId));

  if (!org) {
    return null;
  }

  // If BYOC is enabled and credentials are configured, use them
  if (org.useCustomOauth && org.googleClientId && org.googleClientSecret) {
    const decryptedSecret = decryptIfEncrypted(org.googleClientSecret);
    if (decryptedSecret) {
      return {
        clientId: org.googleClientId,
        clientSecret: decryptedSecret,
      };
    }
  }

  // Fall back to default credentials (for backward compatibility)
  // In new setup, this should not be used unless BYOC is enabled
  if (DEFAULT_CLIENT_ID && DEFAULT_CLIENT_SECRET) {
    return {
      clientId: DEFAULT_CLIENT_ID,
      clientSecret: DEFAULT_CLIENT_SECRET,
    };
  }

  return null;
}

interface GmailTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export function getGmailAuthUrl(
  state: string,
  redirectUri: string,
  credentials?: OAuthCredentials
): string {
  const clientId = credentials?.clientId || DEFAULT_CLIENT_ID;

  if (!clientId) {
    throw new Error('No OAuth client ID configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GMAIL_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  credentials?: OAuthCredentials
): Promise<GmailTokens> {
  const clientId = credentials?.clientId || DEFAULT_CLIENT_ID;
  const clientSecret = credentials?.clientSecret || DEFAULT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('No OAuth credentials configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to exchange code for tokens');
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  credentials?: OAuthCredentials
): Promise<GmailTokens> {
  const clientId = credentials?.clientId || DEFAULT_CLIENT_ID;
  const clientSecret = credentials?.clientSecret || DEFAULT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('No OAuth credentials configured');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || 'Failed to refresh token');
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: refreshToken, // Refresh token doesn't change
    expiry_date: Date.now() + data.expires_in * 1000,
  };
}

export async function getValidAccessToken(gmailAccountId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, gmailAccountId));

  if (!account) {
    throw new Error('Gmail account not found');
  }

  if (!account.accessToken || !account.refreshToken) {
    throw new Error('Gmail account not properly configured');
  }

  // Check if token is expired (with 5 minute buffer)
  const isExpired = account.tokenExpiry && new Date(account.tokenExpiry).getTime() < Date.now() + 5 * 60 * 1000;

  if (isExpired) {
    // Get the org's OAuth credentials (may be BYOC or default)
    const credentials = await getOrgOAuthCredentials(account.organizationId);
    const tokens = await refreshAccessToken(account.refreshToken, credentials || undefined);

    // Update tokens in database
    await db
      .update(gmailAccounts)
      .set({
        accessToken: tokens.access_token,
        tokenExpiry: new Date(tokens.expiry_date),
        updatedAt: new Date(),
      })
      .where(eq(gmailAccounts.id, gmailAccountId));

    return tokens.access_token;
  }

  return account.accessToken;
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: { name: string; value: string }[];
    parts?: GmailMessagePart[];
    body?: {
      data?: string;
      attachmentId?: string;
    };
  };
}

interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  body: {
    data?: string;
    attachmentId?: string;
    size: number;
  };
  parts?: GmailMessagePart[];
}

interface SearchOptions {
  afterDate?: Date;
  beforeDate?: Date;
  maxResults?: number;
  pageToken?: string;
  domains?: string[];
  searchAll?: boolean; // Search all mail instead of just inbox
}

interface SearchResult {
  messageIds: string[];
  nextPageToken?: string;
  hasMore: boolean;
}

export async function searchDmarcEmails(
  accessToken: string,
  options: SearchOptions = {}
): Promise<SearchResult> {
  const { afterDate, beforeDate, maxResults = 50, pageToken, domains, searchAll } = options;

  // Search for DMARC aggregate reports
  // By default, only search inbox (processed emails get archived out of inbox)
  // Use searchAll=true to re-process all mail including archived
  let query = searchAll ? 'has:attachment' : 'in:inbox has:attachment';

  // If domains specified, search for reports about those domains
  if (domains && domains.length > 0) {
    const domainQueries = domains.map(d => `subject:"${d}"`).join(' OR ');
    query += ` (${domainQueries})`;
  } else {
    // Fallback to generic DMARC search
    query += ' (subject:dmarc OR subject:"report domain")';
  }

  if (afterDate) {
    const dateStr = afterDate.toISOString().split('T')[0].replace(/-/g, '/');
    query += ` after:${dateStr}`;
  }

  if (beforeDate) {
    const dateStr = beforeDate.toISOString().split('T')[0].replace(/-/g, '/');
    query += ` before:${dateStr}`;
  }

  console.log('Gmail search query:', query);

  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  });

  if (pageToken) {
    params.set('pageToken', pageToken);
  }

  // Retry with backoff for rate limits
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 1000; // 2s, 4s
      console.log(`[Gmail] Retrying search after ${delay}ms (attempt ${attempt + 1})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log('Gmail search found messages:', data.messages?.length || 0, 'hasMore:', !!data.nextPageToken);

      return {
        messageIds: (data.messages || []).map((m: { id: string }) => m.id),
        nextPageToken: data.nextPageToken,
        hasMore: !!data.nextPageToken,
      };
    }

    if (response.status === 429) {
      const error = await response.text();
      console.warn('Gmail rate limited:', error);
      lastError = new Error('Gmail rate limited');
      continue; // Retry
    }

    // Non-retryable error
    const error = await response.text();
    console.error('Gmail search failed:', error);
    throw new Error('Failed to search Gmail');
  }

  throw lastError || new Error('Failed to search Gmail after retries');
}

export async function getMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get message');
  }

  return response.json();
}

export async function getAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<string> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to get attachment');
  }

  const data = await response.json();
  return data.data; // Base64 encoded content
}

function findXmlParts(part: GmailMessagePart): GmailMessagePart[] {
  const xmlParts: GmailMessagePart[] = [];

  const mimeType = part.mimeType.toLowerCase();

  // Look for XML files or compressed files that might contain XML
  if (
    mimeType === 'application/xml' ||
    mimeType === 'text/xml' ||
    mimeType === 'application/zip' ||
    mimeType === 'application/gzip' ||
    mimeType === 'application/x-gzip' ||
    (part.filename &&
      (part.filename.endsWith('.xml') ||
        part.filename.endsWith('.zip') ||
        part.filename.endsWith('.gz')))
  ) {
    xmlParts.push(part);
  }

  // Recursively check nested parts
  if (part.parts) {
    for (const subPart of part.parts) {
      xmlParts.push(...findXmlParts(subPart));
    }
  }

  return xmlParts;
}

export function extractDmarcAttachments(message: GmailMessage): GmailMessagePart[] {
  const attachments: GmailMessagePart[] = [];

  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      attachments.push(...findXmlParts(part));
    }
  }

  return attachments;
}

export async function addLabel(
  accessToken: string,
  messageId: string,
  labelId: string
): Promise<void> {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: [labelId],
      }),
    }
  );
}

export async function archiveMessage(
  accessToken: string,
  messageId: string,
  labelId?: string
): Promise<void> {
  // Remove from inbox (archive) and optionally add a label
  const body: { addLabelIds?: string[]; removeLabelIds: string[] } = {
    removeLabelIds: ['INBOX'],
  };

  if (labelId) {
    body.addLabelIds = [labelId];
  }

  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
}

export async function createLabel(
  accessToken: string,
  name: string
): Promise<string> {
  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        labelListVisibility: 'labelShow',
        messageListVisibility: 'show',
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.log('[Gmail] Create label response:', response.status, JSON.stringify(error));

    // If label already exists (409 Conflict), find it
    if (error.error?.code === 409) {
      console.log('[Gmail] Label already exists, fetching existing labels...');
      const labelsResponse = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/labels',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const labels = await labelsResponse.json();
      const existingLabel = labels.labels?.find((l: { name: string }) => l.name === name);
      if (existingLabel) {
        console.log('[Gmail] Found existing label:', existingLabel.id);
        return existingLabel.id;
      }
      console.log('[Gmail] Could not find existing label in list');
    }
    throw new Error(`Failed to create label: ${error.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.id;
}

// ============================================
// Email Sending Functions
// ============================================

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Create a MIME message for sending via Gmail API
 */
function createMimeMessage(from: string, options: EmailOptions): string {
  const to = Array.isArray(options.to) ? options.to.join(', ') : options.to;
  const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const messageParts = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(options.text || stripHtml(options.html)).toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(options.html).toString('base64'),
    '',
    `--${boundary}--`,
  ];

  if (options.replyTo) {
    messageParts.splice(3, 0, `Reply-To: ${options.replyTo}`);
  }

  return messageParts.join('\r\n');
}

/**
 * Simple HTML to text conversion
 */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Send an email using the Gmail API
 */
export async function sendEmail(
  accessToken: string,
  fromEmail: string,
  options: EmailOptions
): Promise<{ messageId: string; threadId: string }> {
  const mimeMessage = createMimeMessage(fromEmail, options);

  // Base64url encode the message
  const encodedMessage = Buffer.from(mimeMessage)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const response = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: encodedMessage,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    console.error('Gmail send error:', error);
    throw new Error(error.error?.message || 'Failed to send email');
  }

  const data = await response.json();
  return {
    messageId: data.id,
    threadId: data.threadId,
  };
}

/**
 * Send an email using a connected Gmail account
 * This is the main function to use for sending alerts and reports
 */
export async function sendEmailViaGmail(
  gmailAccountId: string,
  options: EmailOptions
): Promise<{ messageId: string; threadId: string }> {
  // Get the Gmail account details
  const [account] = await db
    .select()
    .from(gmailAccounts)
    .where(eq(gmailAccounts.id, gmailAccountId));

  if (!account) {
    throw new Error('Gmail account not found');
  }

  if (!account.email) {
    throw new Error('Gmail account email not configured');
  }

  // Get a valid access token (refreshes if needed)
  const accessToken = await getValidAccessToken(gmailAccountId);

  // Send the email
  return sendEmail(accessToken, account.email, options);
}

/**
 * Get the primary Gmail account for an organization (for sending)
 * Returns the first Gmail account authorized for sending
 */
export async function getOrgSendingAccount(organizationId: string): Promise<{
  id: string;
  email: string;
} | null> {
  const [account] = await db
    .select({
      id: gmailAccounts.id,
      email: gmailAccounts.email,
    })
    .from(gmailAccounts)
    .where(
      and(
        eq(gmailAccounts.organizationId, organizationId),
        eq(gmailAccounts.sendEnabled, true)
      )
    )
    .limit(1);

  if (!account || !account.email) {
    return null;
  }

  return account;
}
