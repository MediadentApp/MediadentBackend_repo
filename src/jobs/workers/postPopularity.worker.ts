import postPopularityStrategy from '#src/recommendations/strategies/postPopularity.strategy.js';
import { getRedis } from '#src/config/redis.js';
import { Worker } from 'bullmq';

let postPopularityWorker: Worker;

export function initPostPopularityWorker() {
  postPopularityWorker = new Worker(
    'daily-popular-post',
    async () => {
      await postPopularityStrategy();
    },
    { connection: getRedis() }
  );
}

export function getPostPopularityWorker() {
  if (!postPopularityWorker) {
    throw new Error('Worker not initialized');
  }
  return postPopularityWorker;
}
