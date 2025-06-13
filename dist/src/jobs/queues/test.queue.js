import redisConnection from '../../redis.js';
import { Queue } from 'bullmq';
export const testQueue = new Queue('test-queue', { connection: redisConnection });
