import redisConnection from '#src/config/redis.js';
import { Queue } from 'bullmq';

export const postViewCleanupQueue = new Queue('cleanup-postviews', { connection: redisConnection });
