import redisConnection from '#src/config/redis.js';
import { Queue } from 'bullmq';

export const testQueue = new Queue('test-queue', { connection: redisConnection });
