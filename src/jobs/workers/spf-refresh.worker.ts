/**
 * SPF Refresh Worker
 *
 * Re-resolves SPF includes for all known senders that have spfInclude configured.
 * Runs daily to keep IP ranges up to date as providers change their infrastructure.
 */

import { Worker, Job } from 'bullmq';
import { connectionOptions } from '../redis';
import { QUEUE_NAMES } from '../queues';
import { db } from '@/db';
import { knownSenders } from '@/db/schema';
import { eq, isNotNull } from 'drizzle-orm';
import { resolveSpfInclude } from '@/lib/spf-resolver';
import type { SpfRefreshJobData } from '../types';

async function processSpfRefresh(job: Job<SpfRefreshJobData>) {
  console.log('[SPF Refresh] Starting SPF refresh for all known senders...');

  // Find all senders with an SPF include configured
  const sendersWithSpf = await db
    .select({
      id: knownSenders.id,
      name: knownSenders.name,
      spfInclude: knownSenders.spfInclude,
    })
    .from(knownSenders)
    .where(isNotNull(knownSenders.spfInclude));

  if (sendersWithSpf.length === 0) {
    console.log('[SPF Refresh] No senders with SPF includes found');
    return { updated: 0, failed: 0, total: 0 };
  }

  console.log(`[SPF Refresh] Found ${sendersWithSpf.length} senders with SPF includes`);

  let updated = 0;
  let failed = 0;

  for (const sender of sendersWithSpf) {
    try {
      const result = await resolveSpfInclude(sender.spfInclude!);

      if (result.ipRanges.length > 0) {
        await db
          .update(knownSenders)
          .set({
            ipRanges: result.ipRanges,
            spfResolvedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(knownSenders.id, sender.id));

        console.log(`[SPF Refresh] Updated ${sender.name}: ${result.ipRanges.length} IP ranges`);
        updated++;
      } else {
        console.warn(`[SPF Refresh] No IP ranges resolved for ${sender.name}: ${result.errors.join(', ')}`);
        failed++;
      }

      // Small delay between DNS lookups to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SPF Refresh] Failed to refresh ${sender.name}: ${errorMsg}`);
      failed++;
    }
  }

  console.log(`[SPF Refresh] Complete: ${updated} updated, ${failed} failed, ${sendersWithSpf.length} total`);

  return { updated, failed, total: sendersWithSpf.length };
}

export function createSpfRefreshWorker() {
  const worker = new Worker<SpfRefreshJobData>(
    QUEUE_NAMES.SPF_REFRESH,
    processSpfRefresh,
    {
      ...connectionOptions,
      concurrency: 1,
    }
  );

  worker.on('completed', (job, result) => {
    console.log(`[SPF Refresh] Job ${job.id} completed:`, result);
  });

  worker.on('failed', (job, err) => {
    console.error(`[SPF Refresh] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}
