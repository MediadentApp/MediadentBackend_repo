import postPopularityStrategy from '../../recommendations/strategies/postPopularity.strategy.js';
import redisConnection from '../../redis.js';
import { Worker } from 'bullmq';
export const cleanupWorker = new Worker('daily-popular-post', async () => {
    await postPopularityStrategy();
}, { connection: redisConnection });
