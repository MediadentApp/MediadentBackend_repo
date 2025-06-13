import { postViewCleanupQueue } from '../../jobs/queues/postView.queue.js';
import { testQueue } from '../../jobs/queues/test.queue.js';
import { postPopularityQueue } from '../../jobs/queues/postPopularity.queue.js';
const defaultGraceTime = 0;
const defaultStatus = ['completed', 'failed', 'delayed', 'active'];
async function cleanQueue(queue, time = defaultGraceTime, type = defaultStatus) {
    // for (const status of type) {
    //   await queue.clean(time, 1000, status);
    // }
    // await queue.drain();
    await queue.obliterate({ force: true });
}
function setupGracefulCleanup() {
    const cleanup = async () => {
        console.log('\n🧹 Graceful shutdown started...');
        // Clean queues
        await Promise.all([cleanQueue(postViewCleanupQueue), cleanQueue(postPopularityQueue), cleanQueue(testQueue)]);
        // Flush Redis
        // await redisConnection.flushall();
        console.log('🧹 Redis FLUSHALL completed.');
        console.log('✅ Cleanup complete. Exiting.');
        process.exit(0);
    };
    process.on('SIGINT', cleanup); // e.g., Ctrl+C
    process.on('SIGTERM', cleanup); // e.g., Docker stop
}
setupGracefulCleanup();
