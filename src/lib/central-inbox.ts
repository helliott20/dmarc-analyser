/**
 * Central Inbox Processing
 *
 * This module handles syncing the central reports@dmarcanalyser.io mailbox.
 * Reports are routed to the correct domain by parsing the XML <domain> tag.
 *
 * Environment variables required:
 * - CENTRAL_GMAIL_REFRESH_TOKEN: OAuth refresh token for the central mailbox
 * - GOOGLE_CLIENT_ID: Google OAuth client ID (shared with BYOC)
 * - GOOGLE_CLIENT_SECRET: Google OAuth client secret (shared with BYOC)
 */

import { db } from '@/db';
import { domains } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { importDmarcReport } from './report-importer';
import AdmZip from 'adm-zip';
import { gunzipSync } from 'zlib';

// Central inbox email address (only for hosted version)
export const CENTRAL_INBOX_EMAIL = process.env.CENTRAL_INBOX_EMAIL || 'reports@dmarcanalyser.io';

// Check if central inbox is enabled (hosted version only)
// Self-hosted instances should use BYOC/Gmail auth instead
export const isCentralInboxEnabled = (): boolean => {
  return CENTRAL_INBOX_EMAIL === 'reports@dmarcanalyser.io';
};

// OAuth credentials (same as BYOC uses)
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const CENTRAL_GMAIL_REFRESH_TOKEN = process.env.CENTRAL_GMAIL_REFRESH_TOKEN;

interface TokenData {
  accessToken: string;
  expiresAt: number;
}

// In-memory token cache for the central inbox
let cachedToken: TokenData | null = null;

/**
 * Check if central inbox is configured
 */
export function isCentralInboxConfigured(): boolean {
  return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && CENTRAL_GMAIL_REFRESH_TOKEN);
}

/**
 * Get a valid access token for the central inbox
 */
async function getCentralAccessToken(): Promise<string> {
  // Check if we have a cached token that's still valid (with 5 min buffer)
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5 * 60 * 1000) {
    return cachedToken.accessToken;
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !CENTRAL_GMAIL_REFRESH_TOKEN) {
    throw new Error('Central inbox not configured: missing OAuth credentials');
  }

  // Refresh the token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: CENTRAL_GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to refresh central inbox token: ${error.error_description || response.status}`);
  }

  const data = await response.json();

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.accessToken;
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

interface SearchResult {
  messageIds: string[];
  nextPageToken?: string;
  hasMore: boolean;
}

/**
 * Search for DMARC emails in the central inbox
 */
async function searchCentralInbox(
  accessToken: string,
  options: { searchAll?: boolean; maxResults?: number; pageToken?: string } = {}
): Promise<SearchResult> {
  const { searchAll = false, maxResults = 50, pageToken } = options;

  // Search for emails with attachments (DMARC reports)
  // Default: only inbox (processed emails get archived out)
  // searchAll: search all mail including archived
  let query = searchAll ? 'has:attachment' : 'in:inbox has:attachment';
  query += ' (subject:dmarc OR subject:"report domain" OR subject:"aggregate report")';

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
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[Central Inbox] Retrying search after ${delay}ms (attempt ${attempt + 1})`);
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
      console.log('[Central Inbox] Search found messages:', data.messages?.length || 0, 'hasMore:', !!data.nextPageToken);

      return {
        messageIds: (data.messages || []).map((m: { id: string }) => m.id),
        nextPageToken: data.nextPageToken,
        hasMore: !!data.nextPageToken,
      };
    }

    if (response.status === 429) {
      const error = await response.text();
      console.warn('[Central Inbox] Rate limited:', error);
      lastError = new Error('Gmail rate limited');
      continue;
    }

    const error = await response.text();
    console.error('[Central Inbox] Search failed:', error);
    throw new Error('Failed to search central inbox');
  }

  throw lastError || new Error('Failed to search central inbox after retries');
}

/**
 * Get a message from the central inbox
 */
async function getMessage(accessToken: string, messageId: string): Promise<GmailMessage> {
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

/**
 * Get an attachment from a message
 */
async function getAttachment(
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
  return data.data;
}

/**
 * Archive a message (remove from inbox)
 */
async function archiveMessage(accessToken: string, messageId: string): Promise<void> {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        removeLabelIds: ['INBOX'],
      }),
    }
  );
}

/**
 * Find XML parts in a message
 */
function findXmlParts(part: GmailMessagePart): GmailMessagePart[] {
  const xmlParts: GmailMessagePart[] = [];

  const mimeType = part.mimeType.toLowerCase();

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

  if (part.parts) {
    for (const subPart of part.parts) {
      xmlParts.push(...findXmlParts(subPart));
    }
  }

  return xmlParts;
}

/**
 * Extract DMARC attachments from a message
 */
function extractDmarcAttachments(message: GmailMessage): GmailMessagePart[] {
  const attachments: GmailMessagePart[] = [];

  if (message.payload.parts) {
    for (const part of message.payload.parts) {
      attachments.push(...findXmlParts(part));
    }
  }

  return attachments;
}

/**
 * Extract domain from DMARC XML
 */
function extractDomainFromXml(xml: string): string | null {
  const domainMatch = xml.match(/<domain>([^<]+)<\/domain>/);
  return domainMatch ? domainMatch[1].toLowerCase() : null;
}

/**
 * Find the domain ID for a given domain name
 * Returns the domain ID and organization ID if found
 */
async function findDomainByName(domainName: string): Promise<{ domainId: string; organizationId: string } | null> {
  const [domain] = await db
    .select({
      id: domains.id,
      organizationId: domains.organizationId,
    })
    .from(domains)
    .where(sql`LOWER(${domains.domain}) = ${domainName.toLowerCase()}`)
    .limit(1);

  if (!domain) {
    return null;
  }

  return {
    domainId: domain.id,
    organizationId: domain.organizationId,
  };
}

export interface SyncResult {
  emailsProcessed: number;
  reportsFound: number;
  domainsMatched: number;
  errors: string[];
}

/**
 * Sync the central inbox
 * Fetches emails, parses DMARC reports, and routes them to the correct domain
 */
export async function syncCentralInbox(options: { fullSync?: boolean } = {}): Promise<SyncResult> {
  const { fullSync = false } = options;

  console.log('[Central Inbox] Starting sync...');

  if (!isCentralInboxConfigured()) {
    throw new Error('Central inbox not configured');
  }

  const result: SyncResult = {
    emailsProcessed: 0,
    reportsFound: 0,
    domainsMatched: 0,
    errors: [],
  };

  try {
    const accessToken = await getCentralAccessToken();

    let pageToken: string | undefined;
    let hasMore = true;
    const DELAY_BETWEEN_EMAILS_MS = 100;

    while (hasMore) {
      const searchResult = await searchCentralInbox(accessToken, {
        searchAll: fullSync,
        pageToken,
      });

      for (const messageId of searchResult.messageIds) {
        try {
          const message = await getMessage(accessToken, messageId);
          const attachments = extractDmarcAttachments(message);

          let emailDomain = '';
          let emailStatus = 'no-attachment';

          for (const attachment of attachments) {
            try {
              if (!attachment.body.attachmentId) continue;

              const attachmentData = await getAttachment(
                accessToken,
                messageId,
                attachment.body.attachmentId
              );

              // Decode base64url
              const buffer = Buffer.from(
                attachmentData.replace(/-/g, '+').replace(/_/g, '/'),
                'base64'
              );

              // Extract XML content
              let xmlContent: string | null = null;
              const filename = attachment.filename?.toLowerCase() || '';

              if (filename.endsWith('.zip')) {
                const zip = new AdmZip(buffer);
                const entries = zip.getEntries();
                for (const entry of entries) {
                  if (entry.entryName.endsWith('.xml')) {
                    xmlContent = entry.getData().toString('utf8');
                    break;
                  }
                }
              } else if (filename.endsWith('.gz')) {
                const decompressed = gunzipSync(buffer);
                xmlContent = decompressed.toString('utf8');
              } else if (filename.endsWith('.xml')) {
                xmlContent = buffer.toString('utf8');
              }

              if (!xmlContent) continue;

              // Extract domain from XML
              const reportDomain = extractDomainFromXml(xmlContent);
              if (!reportDomain) {
                emailStatus = 'no-domain';
                continue;
              }

              emailDomain = reportDomain;

              // Find matching domain in database
              const domainInfo = await findDomainByName(reportDomain);
              if (!domainInfo) {
                emailStatus = 'domain-not-found';
                console.log(`[Central Inbox] Domain not in system: ${reportDomain}`);
                continue;
              }

              result.domainsMatched++;

              // Import the report
              const importResult = await importDmarcReport(xmlContent, domainInfo.domainId, messageId);

              if (importResult.success) {
                if (importResult.skipped) {
                  emailStatus = 'skipped';
                } else {
                  result.reportsFound++;
                  emailStatus = 'imported';
                }
              } else if (importResult.error) {
                emailStatus = 'error';
                result.errors.push(`Report import failed: ${importResult.error}`);
              }
            } catch (attachmentError) {
              emailStatus = 'error';
              const errorMsg = attachmentError instanceof Error ? attachmentError.message : 'Unknown error';
              result.errors.push(`Attachment error: ${errorMsg}`);
            }
          }

          console.log(`[Central Inbox] ${emailStatus.toUpperCase()}${emailDomain ? `: ${emailDomain}` : ''}`);

          // Archive processed messages
          try {
            await archiveMessage(accessToken, messageId);
          } catch (err) {
            console.warn(`[Central Inbox] Failed to archive message ${messageId}:`, err);
          }

          result.emailsProcessed++;

          // Rate limit delay
          await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_EMAILS_MS));
        } catch (messageError) {
          const errorMsg = messageError instanceof Error ? messageError.message : 'Unknown error';
          result.errors.push(`Message error: ${errorMsg}`);
          result.emailsProcessed++;
        }
      }

      hasMore = searchResult.hasMore;
      pageToken = searchResult.nextPageToken;

      // Safety limit
      if (result.emailsProcessed >= 2000) {
        console.log('[Central Inbox] Reached max emails limit for this sync cycle');
        break;
      }
    }

    console.log(`[Central Inbox] Completed: ${result.emailsProcessed} emails, ${result.reportsFound} reports, ${result.domainsMatched} domains matched`);
    return result;
  } catch (error) {
    console.error('[Central Inbox] Fatal error:', error);
    throw error;
  }
}

/**
 * Generate the RUA email address for DMARC records
 * Returns the central inbox address unless the org has BYOC configured
 */
export function getRuaEmail(orgHasCustomOauth: boolean, connectedGmailEmail?: string | null): string {
  if (orgHasCustomOauth && connectedGmailEmail) {
    return connectedGmailEmail;
  }
  return CENTRAL_INBOX_EMAIL;
}
