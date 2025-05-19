import redisConnection from '#src/redis.js';
import { Queue } from 'bullmq';

export const postPopularityQueue = new Queue('daily-popular-post', { connection: redisConnection });
