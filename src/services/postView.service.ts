import Post from '#src/models/post.model.js';
import { PostView } from '#src/models/postView.model.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';

const postViewServiceHandler = new DebouncedMongoBatchExecutor({
  PostView: {
    create: async (views: any[]) => {
      if (!views.length) return;

      try {
        // Prepare bulk upserts (insert if not exist)
        const postViewOps = views.map(v => ({
          updateOne: {
            filter: { postId: v.postId, userId: v.userId },
            update: { $setOnInsert: v },
            upsert: true,
          },
        }));

        // Run bulkWrite to insert only new ones
        await PostView.bulkWrite(postViewOps, { ordered: false });

        // Count how many unique views per postId
        const countByPostId = views.reduce<Record<string, number>>((acc, { postId }) => {
          acc[postId] = (acc[postId] || 0) + 1;
          return acc;
        }, {});

        const postViewUpdates = Object.entries(countByPostId).map(([postId, inc]) => ({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(postId) },
            update: { $inc: { views: inc } },
          },
        }));

        await Post.bulkWrite(postViewUpdates, { ordered: false });
      } catch (err) {
        console.error('Bulk post view creation error:', err);
      }
    },
  },
});

export default postViewServiceHandler;
