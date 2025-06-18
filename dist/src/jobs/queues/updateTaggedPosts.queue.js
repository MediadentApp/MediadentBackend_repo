import { Queue } from 'bullmq';
import redisConnection from '../../redis.js';
export const updateTaggedPostsQueue = new Queue('refreshPosts', {
    connection: redisConnection,
});
