import redisConnection from '#src/config/redis.js';
import { Queue } from 'bullmq';

export const postPopularityQueue = new Queue('daily-popular-post', { connection: redisConnection });
