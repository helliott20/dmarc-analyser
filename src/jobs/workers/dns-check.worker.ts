import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES, alertsQueue } from '../queues';
import type { DnsCheckJobData, AlertsJobData } from '../types';
import { db } from '@/db';
import { domains } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createDnsChangeAlert } from '@/lib/alerts';
import { scheduleDnsCheckJobs } from '../scheduler';
import dns from 'dns/promises';

interface DnsRecords {
  dmarc?: string;
  spf?: string;
  hasDkim?: boolean;
}

async function fetchDnsRecords(domain: string): Promise<DnsRecords> {
  const result: DnsRecords = {};

  try {
    // Fetch DMARC record
    const dmarcRecords = await dns.resolveTxt(`_dmarc.${domain}`).catch(() => []);
    const dmarcRecord = dmarcRecords.flat().find((r) => r.startsWith('v=DMARC1'));
    result.dmarc = dmarcRecord || undefined;

    // Fetch SPF record
    const spfRecords = await dns.resolveTxt(domain).catch(() => []);
    const spfRecord = spfRecords.flat().find((r) => r.startsWith('v=spf1'));
    result.spf = spfRecord || undefined;

    // Check for DKIM (we can't know the selector, so just check if any exist)
    // This is a basic check - a more complete solution would store/track selectors
    const commonSelectors = ['default', 'google', 'selector1', 'selector2', 'k1', 's1', 'mail'];
    for (const selector of commonSelectors) {
      try {
        const dkimRecords = await dns.resolveTxt(`${selector}._domainkey.${domain}`);
        if (dkimRecords.flat().some((r) => r.includes('v=DKIM1') || r.includes('p='))) {
          result.hasDkim = true;
          break;
        }
      } catch {
        // Selector doesn't exist, try next
      }
    }

    return result;
  } catch (error) {
    console.error(`[DNS Check] Error fetching DNS for ${domain}:`, error);
    return result;
  }
}

async function processDnsCheck(job: Job<DnsCheckJobData>): Promise<void> {
  const { domainId, organizationId } = job.data;

  console.log(`[DNS Check] Checking DNS for domain ${domainId}`);

  // Get domain info
  const [domain] = await db
    .select({
      id: domains.id,
      domain: domains.domain,
      dmarcRecord: domains.dmarcRecord,
      spfRecord: domains.spfRecord,
    })
    .from(domains)
    .where(eq(domains.id, domainId));

  if (!domain) {
    console.warn(`[DNS Check] Domain ${domainId} not found`);
    return;
  }

  // Fetch current DNS records
  const currentRecords = await fetchDnsRecords(domain.domain);

  // Check for changes
  const dmarcChanged = domain.dmarcRecord !== (currentRecords.dmarc || null);
  const spfChanged = domain.spfRecord !== (currentRecords.spf || null);

  // Create alerts for changes
  if (dmarcChanged) {
    await createDnsChangeAlert({
      organizationId,
      domainId,
      recordType: 'DMARC',
      oldValue: domain.dmarcRecord || undefined,
      newValue: currentRecords.dmarc,
    });
  }

  if (spfChanged) {
    await createDnsChangeAlert({
      organizationId,
      domainId,
      recordType: 'SPF',
      oldValue: domain.spfRecord || undefined,
      newValue: currentRecords.spf,
    });
  }

  // Update domain with current DNS records
  await db
    .update(domains)
    .set({
      dmarcRecord: currentRecords.dmarc || null,
      spfRecord: currentRecords.spf || null,
      lastDnsCheck: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(domains.id, domainId));

  // Trigger webhook if any changes
  if (dmarcChanged || spfChanged) {
    const alertData: AlertsJobData = {
      type: 'dns_change',
      domainId,
      organizationId,
    };
    await alertsQueue.add(`dns-change-${domainId}`, alertData);
  }

  console.log(`[DNS Check] Completed for ${domain.domain}`);
}

// Handle scheduled trigger vs direct check
async function processJob(job: Job<DnsCheckJobData | { type: string }>): Promise<void> {
  // Check if this is a scheduler trigger
  if ('type' in job.data && job.data.type === 'scheduled') {
    console.log('[DNS Check] Scheduler triggered - scheduling all domain checks');
    await scheduleDnsCheckJobs();
    return;
  }

  return processDnsCheck(job as Job<DnsCheckJobData>);
}

// Create and export the worker
export function createDnsCheckWorker() {
  const worker = new Worker(QUEUE_NAMES.DNS_CHECK, processJob, {
    connection: createRedisConnection(),
    concurrency: 10,
  });

  worker.on('completed', (job) => {
    console.log(`[DNS Check Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[DNS Check Worker] Job ${job?.id} failed:`, error);
  });

  return worker;
}
