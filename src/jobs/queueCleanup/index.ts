import { getRedis } from '#src/config/redis.js';
import { Queue } from 'bullmq';
import { postViewCleanupQueue, postPopularityQueue, testQueue } from '../queues/index.js';

type Status = 'completed' | 'wait' | 'active' | 'paused' | 'prioritized' | 'delayed' | 'failed';
const defaultGraceTime = 0;
const defaultStatus: Status[] = ['completed', 'failed', 'delayed', 'active'];

async function cleanQueue(queue: Queue, time: number = defaultGraceTime, type: Status[] = defaultStatus) {
  // for (const status of type) {
  //   await queue.clean(time, 1000, status);
  // }
  // await queue.drain();
  await queue.obliterate({ force: true });
}

function setupGracefulCleanup() {
  const cleanup = async () => {
    console.log('\n🧹 Graceful shutdown started...');
    const redisConnection = getRedis();

    // Clean queues
    await Promise.all([cleanQueue(postViewCleanupQueue), cleanQueue(postPopularityQueue), cleanQueue(testQueue)]);

    // Flush Redis
    await redisConnection.flushall();
    console.log('🧹 Redis FLUSHALL completed.');

    console.log('✅ Cleanup complete. Exiting.');
    process.exit(0);
  };

  process.on('SIGINT', cleanup); // e.g., Ctrl+C
  process.on('SIGTERM', cleanup); // e.g., Docker stop
}

setupGracefulCleanup();
