import appConfig from '#src/config/appConfig.js';
import { PostView } from '#src/models/postView.model.js';
import redisConnection from '#src/redis.js';
import { Worker } from 'bullmq';

export const cleanupWorker = new Worker(
  'cleanup-postviews',
  async () => {
    const thirtyDaysAgo = new Date(Date.now() - appConfig.app.post.postViewExpiry);
    const result = await PostView.deleteMany({ viewedAt: { $lt: thirtyDaysAgo } });
    console.log(`[BullMQ] Deleted ${result.deletedCount} old PostView entries`);
  },
  { connection: redisConnection }
);
