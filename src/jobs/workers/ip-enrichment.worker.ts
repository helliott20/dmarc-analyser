import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES } from '../queues';
import type { IpEnrichmentJobData } from '../types';
import { db } from '@/db';
import { sources } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';

interface IpApiResponse {
  status: 'success' | 'fail';
  message?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query: string;
}

// Rate limiting: ip-api.com allows 45 requests per minute for free
// Track API calls to stay under limit
let lastApiCall = 0;
const MIN_API_INTERVAL_MS = 1500; // 1.5 seconds between API calls (40/min max)

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;
  if (timeSinceLastCall < MIN_API_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_API_INTERVAL_MS - timeSinceLastCall));
  }
  lastApiCall = Date.now();
}

// Custom error for rate limiting
class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}

function isPrivateIp(ipAddress: string): boolean {
  return (
    ipAddress.startsWith('10.') ||
    ipAddress.startsWith('192.168.') ||
    ipAddress.startsWith('172.16.') ||
    ipAddress.startsWith('172.17.') ||
    ipAddress.startsWith('172.18.') ||
    ipAddress.startsWith('172.19.') ||
    ipAddress.startsWith('172.2') ||
    ipAddress.startsWith('172.30.') ||
    ipAddress.startsWith('172.31.') ||
    ipAddress.startsWith('127.') ||
    ipAddress === '::1' ||
    ipAddress.startsWith('fe80:') ||
    ipAddress.startsWith('fc') ||
    ipAddress.startsWith('fd')
  );
}

async function fetchIpInfo(ipAddress: string): Promise<IpApiResponse> {
  // Skip private/local IPs
  if (isPrivateIp(ipAddress)) {
    return {
      status: 'fail',
      message: 'private range',
      query: ipAddress,
    };
  }

  const response = await fetch(
    `http://ip-api.com/json/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`
  );

  if (response.status === 429) {
    throw new RateLimitError('IP API rate limit exceeded');
  }

  if (!response.ok) {
    throw new Error(`IP API returned ${response.status}`);
  }

  return response.json();
}

async function processIpEnrichment(job: Job<IpEnrichmentJobData>): Promise<void> {
  const { sourceId, ipAddress } = job.data;

  // Check if source still exists and needs enrichment
  const [source] = await db
    .select({
      id: sources.id,
      country: sources.country,
    })
    .from(sources)
    .where(eq(sources.id, sourceId));

  if (!source) {
    console.log(`[IP Enrichment] ${ipAddress}: source not found, skipping`);
    return;
  }

  if (source.country) {
    console.log(`[IP Enrichment] ${ipAddress}: already enriched, skipping`);
    return;
  }

  // Check if we have cached data from another source with the same IP
  const [cachedSource] = await db
    .select({
      country: sources.country,
      region: sources.region,
      city: sources.city,
      asn: sources.asn,
      asnOrg: sources.asnOrg,
      organization: sources.organization,
    })
    .from(sources)
    .where(
      and(
        eq(sources.sourceIp, ipAddress),
        isNotNull(sources.country)
      )
    )
    .limit(1);

  if (cachedSource) {
    // Use cached data from another source with same IP
    await db
      .update(sources)
      .set({
        country: cachedSource.country,
        region: cachedSource.region,
        city: cachedSource.city,
        asn: cachedSource.asn,
        asnOrg: cachedSource.asnOrg,
        organization: cachedSource.organization,
        updatedAt: new Date(),
      })
      .where(eq(sources.id, sourceId));
    console.log(`[IP Enrichment] ${ipAddress}: cached (${cachedSource.organization})`);
    return;
  }

  // No cache - need to call API
  console.log(`[IP Enrichment] ${ipAddress}: fetching from API`);

  try {
    // Wait for rate limit before API call
    await waitForRateLimit();
    const ipInfo = await fetchIpInfo(ipAddress);

    if (ipInfo.status === 'success') {
      // Parse ASN from the 'as' field (format: "AS15169 Google LLC")
      const asnMatch = ipInfo.as?.match(/^AS(\d+)/);
      const asn = asnMatch ? asnMatch[0] : null;

      await db
        .update(sources)
        .set({
          country: ipInfo.countryCode || null,
          region: ipInfo.regionName || null,
          city: ipInfo.city || null,
          asn: asn,
          asnOrg: ipInfo.isp || null,
          organization: ipInfo.org || ipInfo.isp || null,
          updatedAt: new Date(),
        })
        .where(eq(sources.id, sourceId));

      console.log(`[IP Enrichment] ${ipAddress}: ${ipInfo.countryCode}, ${ipInfo.org || ipInfo.isp}`);
    } else {
      // Mark as attempted but failed
      if (ipInfo.message === 'private range') {
        await db
          .update(sources)
          .set({
            country: 'Private',
            organization: 'Private Network',
            updatedAt: new Date(),
          })
          .where(eq(sources.id, sourceId));
        console.log(`[IP Enrichment] ${ipAddress}: private IP`);
      } else {
        console.warn(`[IP Enrichment] ${ipAddress}: failed - ${ipInfo.message}`);
      }
    }
  } catch (error) {
    console.error(`[IP Enrichment] ${ipAddress}: error -`, error);
    throw error; // Re-throw to trigger retry
  }
}

// Create and export the worker
export function createIpEnrichmentWorker() {
  const worker = new Worker(QUEUE_NAMES.IP_ENRICHMENT, processIpEnrichment, {
    connection: createRedisConnection(),
    concurrency: 10, // Higher concurrency - most jobs are cache hits
    limiter: {
      max: 500, // Allow many jobs/min since most are cache hits (only ~30 API calls/min)
      duration: 60000,
    },
    settings: {
      backoffStrategy: (attemptsMade: number) => {
        // Exponential backoff for API failures: 30s, 60s, 120s, 240s
        return Math.min(30000 * Math.pow(2, attemptsMade - 1), 300000);
      },
    },
  });

  // Track completion counts
  let completedCount = 0;
  worker.on('completed', () => {
    completedCount++;
    if (completedCount % 50 === 0) {
      console.log(`[IP Enrichment] ${completedCount} jobs completed so far`);
    }
  });

  worker.on('failed', (job, error) => {
    if (error instanceof RateLimitError) {
      console.warn(`[IP Enrichment Worker] Job ${job?.id} rate limited, will retry with backoff`);
    } else {
      console.error(`[IP Enrichment Worker] Job ${job?.id} failed:`, error);
    }
  });

  return worker;
}
