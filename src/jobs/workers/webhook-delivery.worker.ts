import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../redis';
import { QUEUE_NAMES } from '../queues';
import type { WebhookDeliveryJobData, WebhookDeliveryResult } from '../types';
import { db } from '@/db';
import { webhooks } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { sendWebhook, type WebhookType, type WebhookPayload } from '@/lib/webhooks';

async function processWebhookDelivery(job: Job<WebhookDeliveryJobData>): Promise<WebhookDeliveryResult> {
  const { webhookId, event, payload } = job.data;
  const attempt = job.attemptsMade + 1;

  console.log(`[Webhook Delivery] Delivering webhook ${webhookId} event ${event} (attempt ${attempt})`);

  // Get webhook config
  const [webhook] = await db
    .select()
    .from(webhooks)
    .where(eq(webhooks.id, webhookId));

  if (!webhook) {
    console.warn(`[Webhook Delivery] Webhook ${webhookId} not found`);
    return { statusCode: 404, success: false, responseTime: 0 };
  }

  if (!webhook.isActive) {
    console.log(`[Webhook Delivery] Webhook ${webhookId} is inactive, skipping`);
    return { statusCode: 0, success: true, responseTime: 0 };
  }

  // Build the payload
  const webhookPayload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    organizationId: webhook.organizationId,
    data: payload,
  };

  const startTime = Date.now();

  try {
    const result = await sendWebhook(
      webhook.type as WebhookType,
      webhook.url,
      webhookPayload,
      webhook.secret || undefined
    );

    const responseTime = Date.now() - startTime;

    if (result.success) {
      // Update webhook stats
      await db
        .update(webhooks)
        .set({
          lastTriggeredAt: new Date(),
          failureCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(webhooks.id, webhookId));

      console.log(`[Webhook Delivery] Webhook ${webhookId} delivered successfully in ${responseTime}ms`);
      return { statusCode: 200, success: true, responseTime };
    } else {
      // Update failure count
      await db
        .update(webhooks)
        .set({
          failureCount: sql`${webhooks.failureCount} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(webhooks.id, webhookId));

      // Disable webhook after too many failures
      const [updated] = await db
        .select({ failureCount: webhooks.failureCount })
        .from(webhooks)
        .where(eq(webhooks.id, webhookId));

      if (updated && updated.failureCount >= 10) {
        await db
          .update(webhooks)
          .set({
            isActive: false,
            updatedAt: new Date(),
          })
          .where(eq(webhooks.id, webhookId));

        console.warn(`[Webhook Delivery] Webhook ${webhookId} disabled after ${updated.failureCount} failures`);
      }

      console.error(`[Webhook Delivery] Webhook ${webhookId} failed: ${result.error}`);
      throw new Error(result.error || 'Webhook delivery failed');
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error(`[Webhook Delivery] Error delivering webhook ${webhookId}:`, error);

    // Update failure count
    await db
      .update(webhooks)
      .set({
        failureCount: sql`${webhooks.failureCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(webhooks.id, webhookId));

    // Re-throw to trigger retry
    throw error;
  }
}

// Create and export the worker
export function createWebhookDeliveryWorker() {
  const worker = new Worker(QUEUE_NAMES.WEBHOOK_DELIVERY, processWebhookDelivery, {
    connection: createRedisConnection(),
    concurrency: 20, // High concurrency for webhook delivery
  });

  worker.on('completed', (job, result) => {
    console.log(`[Webhook Delivery Worker] Job ${job.id} completed: ${result?.success ? 'success' : 'failed'}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`[Webhook Delivery Worker] Job ${job?.id} failed:`, error);
  });

  return worker;
}
