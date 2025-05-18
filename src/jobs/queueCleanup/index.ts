import redisConnection from '#src/redis.js';
import { postViewCleanupQueue } from '#src/jobs/queues/postView.queue.js';
import { testQueue } from '#src/jobs/queues/test.queue.js';
import { Queue } from 'bullmq';

type Status = 'completed' | 'wait' | 'active' | 'paused' | 'prioritized' | 'delayed' | 'failed';
const defaultGraceTime = 0;
const defaultStatus: Status[] = ['completed', 'failed', 'delayed', 'failed', 'active'];

async function cleanQueue(queue: Queue, time: number = defaultGraceTime, type: Status[] = defaultStatus) {
  for (const status of type) {
    await queue.drain();
    await queue.clean(time, 1000, status);
    await redisConnection.flushall();
  }
}

cleanQueue(postViewCleanupQueue);
cleanQueue(testQueue);

/* 
await myQueue.drain(); // Remove all waiting and delayed jobs
await myQueue.obliterate({ force: true }); // Remove everything including active jobs
 */
