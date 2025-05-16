import redisConnection from '#src/redis.js';
import { Worker } from 'bullmq';

export const testWorker = new Worker(
  'test-queue',
  async job => {
    console.log('Processing job:', job.name);
    console.log('Job data:', job.data);
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 500));
    return 'done';
  },
  { connection: redisConnection }
);

/**
 * $ curl -X POST http://localhost:3001/admin/queues/api/queues/test-queue/add   -H 'Content-Type: application/json'   -d '{
    "name": "log-message",
    "data": { "message": "Added manually 2 from cmd" },
    "options": {}
  }'
 */
