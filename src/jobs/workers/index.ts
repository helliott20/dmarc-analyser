/**
 * Worker entry point
 *
 * This file starts all background workers for the DMARC Analyser.
 * Run this as a separate process: `npx tsx src/jobs/workers/index.ts`
 */

// Load environment variables FIRST (tsx doesn't auto-load .env files like Next.js)
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

// Verify DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  console.error('[Workers] ERROR: DATABASE_URL not found in environment');
  console.error('[Workers] Make sure .env.local exists with DATABASE_URL set');
  process.exit(1);
}

console.log('[Workers] Environment loaded, DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));

// Worker interface for graceful shutdown
interface WorkerInstance {
  close(): Promise<void>;
}

// Now import everything else AFTER env is loaded
async function main() {
  // Dynamic imports to ensure env is loaded first
  const { createGmailSyncWorker } = await import('./gmail-sync.worker');
  const { createScheduledReportsWorker } = await import('./scheduled-reports.worker');
  const { createAlertsWorker } = await import('./alerts.worker');
  const { createWebhookDeliveryWorker } = await import('./webhook-delivery.worker');
  const { createCleanupWorker } = await import('./cleanup.worker');
  const { createIpEnrichmentWorker } = await import('./ip-enrichment.worker');
  const { createDnsCheckWorker } = await import('./dns-check.worker');
  const { setupRepeatableJobs, removeRepeatableJobs } = await import('../scheduler');

  // Graceful shutdown handling
  let isShuttingDown = false;
  const workers: WorkerInstance[] = [];

  async function shutdown() {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n[Workers] Shutting down...');

    // Close all workers gracefully
    await Promise.all(workers.map((worker) => worker.close()));

    console.log('[Workers] All workers stopped');
    process.exit(0);
  }

  console.log('[Workers] Starting DMARC Analyser workers...');

  // Create all workers
  workers.push(createGmailSyncWorker());
  workers.push(createScheduledReportsWorker());
  workers.push(createAlertsWorker());
  workers.push(createWebhookDeliveryWorker());
  workers.push(createCleanupWorker());
  workers.push(createIpEnrichmentWorker());
  workers.push(createDnsCheckWorker());

  console.log(`[Workers] Started ${workers.length} workers:`);
  console.log('  - Gmail Sync (every 15 min)');
  console.log('  - Scheduled Reports (checks every hour)');
  console.log('  - Alerts (on report import)');
  console.log('  - Webhook Delivery (with retry)');
  console.log('  - Cleanup (daily at 2am)');
  console.log('  - IP Enrichment (rate-limited)');
  console.log('  - DNS Check (every 6 hours)');

  // Set up repeatable jobs
  console.log('[Workers] Setting up scheduled jobs...');
  await removeRepeatableJobs(); // Clean up any stale repeatable jobs
  await setupRepeatableJobs();

  console.log('[Workers] All workers running. Press Ctrl+C to stop.');

  // Handle graceful shutdown
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

// Run the main function
main().catch((error) => {
  console.error('[Workers] Fatal error:', error);
  process.exit(1);
});
