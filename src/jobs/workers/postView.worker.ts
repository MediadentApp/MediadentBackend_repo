import appConfig from '#src/config/appConfig.js';
import { PostView } from '#src/models/postView.model.js';
import redisConnection from '#src/redis.js';
import { IPostView } from '#src/types/model.post.type.js';
import { Worker } from 'bullmq';

export const cleanupWorker = new Worker(
  'cleanup-postviews',
  async () => {
    const expire = new Date(Date.now() - appConfig.app.post.postViewExpiry);
    const BATCH_SIZE = 500;
    let deletedTotal = 0;
    let lastId = null;

    while (true) {
      const batch: IPostView[] = await PostView.find({
        viewedAt: { $lt: expire },
        ...(lastId && { _id: { $gt: lastId } }),
      })
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .select('_id');

      if (batch.length === 0) break;

      const idsToDelete = batch.map(doc => doc._id);
      const result = await PostView.deleteMany({ _id: { $in: idsToDelete } });
      deletedTotal += result.deletedCount || 0;
      lastId = batch[batch.length - 1]._id;
    }

    console.log(`[BullMQ] Deleted ${deletedTotal} old PostView entries`);
  },
  { connection: redisConnection }
);
