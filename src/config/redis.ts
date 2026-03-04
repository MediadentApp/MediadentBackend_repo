import { Redis } from 'ioredis';

let redis: Redis | null = null;

/**
 * Connect to Redis (call once during bootstrap)
 */
export async function connectRedis(): Promise<Redis> {
  if (!process.env.REDIS_URL) {
    throw new Error('REDIS_URL not defined');
  }

  if (redis) return redis;

  redis = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    connectTimeout: 10_000,
    maxRetriesPerRequest: null,

    retryStrategy(times) {
      if (times > 8) return null;
      return Math.min(1000 * 2 ** times, 30_000);
    },

    reconnectOnError(err) {
      const nodeErr = err as Error & { code?: string };
      return nodeErr?.code === 'ENOTFOUND' || nodeErr?.code === 'ECONNREFUSED' || nodeErr?.code === 'ETIMEDOUT';
    },
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });

  redis.on('error', err => {
    console.error('Redis error:', err);
  });

  await redis.connect();
  await redis.ping();

  return redis;
}

/**
 * Get Redis instance (after connectRedis)
 */
export function getRedis(): Redis {
  if (!redis) {
    throw new Error('Redis not initialized. Call connectRedis() first.');
  }
  return redis;
}

/**
 * Graceful shutdown
 */
export async function disconnectRedis(): Promise<void> {
  if (!redis) return;

  await redis.quit();
  redis = null;
  console.log('Redis disconnected');
}
