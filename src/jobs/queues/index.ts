import { Queue } from 'bullmq';
import { getRedis } from '#src/config/redis.js';

export let postViewCleanupQueue: Queue;
export let testQueue: Queue;
export let updateTaggedPostsQueue: Queue;
export let postPopularityQueue: Queue;

export function initQueues() {
  const connection = getRedis();

  postViewCleanupQueue = new Queue('cleanup-postviews', {
    connection,
  });

  testQueue = new Queue('test-queue', {
    connection,
  });

  updateTaggedPostsQueue = new Queue('refreshPosts', {
    connection,
  });

  postPopularityQueue = new Queue('daily-popular-post', {
    connection,
  });

  console.log('Queues initialized');
}
