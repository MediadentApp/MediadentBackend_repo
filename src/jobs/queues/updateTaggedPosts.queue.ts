import { Queue } from 'bullmq';
import redisConnection from '#src/config/redis.js';

export const updateTaggedPostsQueue = new Queue('refreshPosts', {
  connection: redisConnection,
});
