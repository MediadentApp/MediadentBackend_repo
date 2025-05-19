import postPopularityStrategy from '#src/recommendations/strategies/postPopularity.strategy.js';
import redisConnection from '#src/redis.js';
import { Worker } from 'bullmq';

export const cleanupWorker = new Worker(
  'daily-popular-post',
  async () => {
    await postPopularityStrategy();
  },
  { connection: redisConnection }
);
