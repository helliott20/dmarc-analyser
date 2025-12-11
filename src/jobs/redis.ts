import IORedis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Create a shared Redis connection for BullMQ
export const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null, // Required for BullMQ
  enableReadyCheck: false,
});

// Connection options for BullMQ queues and workers
export const connectionOptions = {
  connection: redisConnection,
};

// Helper to create a new connection (for workers that need their own)
export function createRedisConnection() {
  return new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
