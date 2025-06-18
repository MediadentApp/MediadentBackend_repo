import { Queue } from 'bullmq';
import redisConnection from '#src/redis.js';

export const updateTaggedPostsQueue = new Queue('refreshPosts', {
  connection: redisConnection,
});
