import redisConnection from '#src/redis.js';
import { Queue } from 'bullmq';

export const postViewCleanupQueue = new Queue('cleanup-postviews', { connection: redisConnection });
