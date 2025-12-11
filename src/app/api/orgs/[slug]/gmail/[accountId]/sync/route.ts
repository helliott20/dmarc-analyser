import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/db';
import { organizations, orgMembers, gmailAccounts, domains } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import {
  getValidAccessToken,
  searchDmarcEmails,
  getMessage,
  getAttachment,
  extractDmarcAttachments,
  createLabel,
  archiveMessage,
} from '@/lib/gmail';
import { importDmarcReportFromXml } from '@/lib/report-importer';
import { gunzipSync } from 'zlib';
import AdmZip from 'adm-zip';

interface RouteParams {
  params: Promise<{ slug: string; accountId: string }>;
}

async function getAccountWithAccess(
  accountId: string,
  orgSlug: string,
  userId: string
) {
  const [result] = await db
    .select({
      account: gmailAccounts,
      organization: organizations,
      role: orgMembers.role,
    })
    .from(gmailAccounts)
    .innerJoin(organizations, eq(gmailAccounts.organizationId, organizations.id))
    .innerJoin(orgMembers, eq(organizations.id, orgMembers.organizationId))
    .where(
      and(
        eq(gmailAccounts.id, accountId),
        eq(organizations.slug, orgSlug),
        eq(orgMembers.userId, userId)
      )
    );

  return result;
}

function decodeBase64Url(data: string): Buffer {
  // Convert base64url to base64
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

async function extractXmlFromAttachment(
  data: string,
  filename: string
): Promise<string | null> {
  try {
    const buffer = decodeBase64Url(data);

    // Check if it's gzipped
    if (filename.endsWith('.gz') || (buffer[0] === 0x1f && buffer[1] === 0x8b)) {
      const decompressed = gunzipSync(buffer);
      return decompressed.toString('utf-8');
    }

    // Check if it's a ZIP file
    if (filename.endsWith('.zip') || (buffer[0] === 0x50 && buffer[1] === 0x4b)) {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries();

      // Find the XML file in the ZIP
      for (const entry of entries) {
        if (entry.entryName.endsWith('.xml') && !entry.isDirectory) {
          const content = entry.getData();
          // Check if the XML inside is also gzipped
          if (content[0] === 0x1f && content[1] === 0x8b) {
            const decompressed = gunzipSync(content);
            return decompressed.toString('utf-8');
          }
          return content.toString('utf-8');
        }
      }

      // No XML found in ZIP
      console.log('No XML file found in ZIP:', filename);
      return null;
    }

    // Assume it's plain XML
    return buffer.toString('utf-8');
  } catch (error) {
    console.error('Failed to extract XML from attachment:', error);
    return null;
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { slug, accountId } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body for pagination and options
    let pageToken: string | undefined;
    let searchAll = false; // Search all mail, not just inbox (for re-processing)
    try {
      const body = await request.json();
      pageToken = body.pageToken;
      searchAll = body.searchAll === true;
    } catch {
      // No body or invalid JSON - use defaults
    }

    const result = await getAccountWithAccess(accountId, slug, session.user.id);

    if (!result) {
      return NextResponse.json(
        { error: 'Account not found or insufficient permissions' },
        { status: 404 }
      );
    }

    const { account, organization } = result;

    // Get valid access token (refreshes if needed)
    const accessToken = await getValidAccessToken(accountId);

    // Get organization's domains
    const orgDomains = await db
      .select()
      .from(domains)
      .where(eq(domains.organizationId, organization.id));

    if (orgDomains.length === 0) {
      return NextResponse.json({
        imported: 0,
        skipped: 0,
        errors: 0,
        hasMore: false,
        message: 'No domains configured. Add domains first.',
      });
    }

    // Create a map of domain names to domain IDs
    const domainMap = new Map(
      orgDomains.map((d) => [d.domain.toLowerCase(), d.id])
    );

    // Search for DMARC emails filtered by our domains
    // By default only searches inbox (processed emails are archived)
    // Use searchAll=true to re-process all emails including archived
    const domainNames = orgDomains.map(d => d.domain);
    const searchResult = await searchDmarcEmails(accessToken, {
      maxResults: 50,
      pageToken,
      domains: domainNames,
      searchAll,
    });

    const { messageIds, nextPageToken, hasMore } = searchResult;

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    // Create or get the "DMARC Processed" label
    let labelId: string | null = null;
    try {
      labelId = await createLabel(accessToken, 'DMARC Processed');
    } catch (error) {
      console.error('Failed to create label:', error);
    }

    console.log(`[Gmail Sync] Processing ${messageIds.length} messages for domains:`, Array.from(domainMap.keys()));

    // Mark sync as started
    await db
      .update(gmailAccounts)
      .set({
        syncStatus: 'syncing',
        syncStartedAt: new Date(),
        syncProgress: { imported: 0, skipped: 0, errors: 0, batchesProcessed: 0 },
      })
      .where(eq(gmailAccounts.id, accountId));

    // Process messages sequentially to avoid rate limits and improve reliability
    const BATCH_SIZE = 3; // Smaller batches for better progress visibility
    for (let i = 0; i < messageIds.length; i += BATCH_SIZE) {
      const batch = messageIds.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;

      console.log(`[Gmail Sync] Processing batch ${batchNum}, messages ${i + 1}-${Math.min(i + BATCH_SIZE, messageIds.length)}`);

      const results = await Promise.allSettled(
        batch.map(async (messageId) => {
          try {
            const message = await getMessage(accessToken, messageId);
            const attachments = extractDmarcAttachments(message);

            let batchImported = 0;
            let batchSkipped = 0;
            let batchErrors = 0;
            let shouldArchive = false;

            for (const attachment of attachments) {
              if (!attachment.body.attachmentId) continue;

              try {
                const attachmentData = await getAttachment(
                  accessToken,
                  messageId,
                  attachment.body.attachmentId
                );

                const xml = await extractXmlFromAttachment(
                  attachmentData,
                  attachment.filename || 'report.xml'
                );

                if (!xml) {
                  console.log(`[Gmail Sync] Could not extract XML from ${attachment.filename}`);
                  continue;
                }

                const domainMatch = xml.match(/<policy_published>[\s\S]*?<domain>([^<]+)<\/domain>/);
                if (!domainMatch) {
                  console.log(`[Gmail Sync] No domain found in XML from ${attachment.filename}`);
                  continue;
                }

                const reportDomain = domainMatch[1].toLowerCase();
                const domainId = domainMap.get(reportDomain);

                if (!domainId) {
                  console.log(`[Gmail Sync] Domain ${reportDomain} not tracked, skipping`);
                  batchSkipped++;
                  continue;
                }

                const importResult = await importDmarcReportFromXml(
                  xml,
                  domainId,
                  messageId
                );

                if (importResult.success) {
                  shouldArchive = true;
                  if (importResult.skipped) {
                    console.log(`[Gmail Sync] Report already imported: ${importResult.skipReason}`);
                    batchSkipped++;
                  } else {
                    console.log(`[Gmail Sync] Imported report for ${reportDomain}`);
                    batchImported++;
                  }
                } else {
                  console.error(`[Gmail Sync] Import failed: ${importResult.error}`);
                  batchErrors++;
                }
              } catch (attachmentError) {
                console.error(`[Gmail Sync] Attachment error:`, attachmentError);
                batchErrors++;
              }
            }

            // Only archive if we successfully processed a report
            if (shouldArchive) {
              try {
                await archiveMessage(accessToken, messageId, labelId || undefined);
              } catch (archiveError) {
                console.warn(`[Gmail Sync] Archive failed:`, archiveError);
              }
            }

            return { imported: batchImported, skipped: batchSkipped, errors: batchErrors };
          } catch (messageError) {
            console.error(`[Gmail Sync] Message ${messageId} error:`, messageError);
            return { imported: 0, skipped: 0, errors: 1 };
          }
        })
      );

      // Aggregate results
      for (const result of results) {
        if (result.status === 'fulfilled') {
          imported += result.value.imported;
          skipped += result.value.skipped;
          errors += result.value.errors;
        } else {
          console.error(`[Gmail Sync] Promise rejected:`, result.reason);
          errors++;
        }
      }

      const currentBatch = Math.ceil((i + BATCH_SIZE) / BATCH_SIZE);
      console.log(`[Gmail Sync] Batch ${currentBatch} complete: ${imported} imported, ${skipped} skipped, ${errors} errors`);

      // Update progress in database after each batch
      await db
        .update(gmailAccounts)
        .set({
          syncProgress: {
            imported,
            skipped,
            errors,
            batchesProcessed: currentBatch
          },
        })
        .where(eq(gmailAccounts.id, accountId));

      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < messageIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    // Update last sync time and mark as complete if no more pages
    await db
      .update(gmailAccounts)
      .set({
        lastSyncAt: new Date(),
        updatedAt: new Date(),
        ...(hasMore ? {} : { syncStatus: 'idle' }), // Only mark idle when fully done
      })
      .where(eq(gmailAccounts.id, accountId));

    console.log(`[Gmail Sync] Batch complete: ${imported} imported, ${skipped} skipped, ${errors} errors, hasMore: ${hasMore}`);

    return NextResponse.json({
      imported,
      skipped,
      errors,
      total: messageIds.length,
      hasMore,
      nextPageToken,
    });
  } catch (error) {
    console.error('Gmail sync failed:', error);

    // Try to mark sync as failed/idle on error
    try {
      const { accountId: accId } = await params;
      await db
        .update(gmailAccounts)
        .set({ syncStatus: 'idle' })
        .where(eq(gmailAccounts.id, accId));
    } catch {
      // Ignore - params might not be available
    }

    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}
