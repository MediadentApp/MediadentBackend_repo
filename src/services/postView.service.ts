import Post from '#src/models/post.model.js';
import { PostView } from '#src/models/postView.model.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';

const postViewServiceHandler = new DebouncedMongoBatchExecutor({
  PostView: {
    create: async (views: any[]) => {
      // const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Filter out already-viewed ones
      const filteredViews: any[] = [];

      for (const v of views) {
        const exists = await PostView.findOne({
          postId: v.postId,
          userId: v.userId,
          // viewedAt: { $gte: oneDayAgo },
        });

        // console.log('exists', exists);
        if (!exists) filteredViews.push(v);
      }

      // console.log('filtered post views', filteredViews);

      if (filteredViews.length) {
        // No need to await
        const postViews = PostView.insertMany(filteredViews, { ordered: false }).catch(err => {
          console.error('create post views error', err);
        });
        const countByPostId = filteredViews.reduce<Record<string, number>>((acc, { postId }) => {
          acc[postId] = (acc[postId] || 0) + 1;
          return acc;
        }, {});

        const bulkViewUpdates = Object.entries(countByPostId).map(([postId, inc]) => ({
          updateOne: {
            filter: { _id: new mongoose.Types.ObjectId(postId) },
            update: { $inc: { views: inc } },
          },
        }));

        // console.log('bulkViewUpdates', JSON.stringify(bulkViewUpdates, null, 2));

        // No need to await
        const updatePostViews = Post.bulkWrite(bulkViewUpdates);

        await Promise.all([postViews, updatePostViews]);
      }
    },
  },
});

export default postViewServiceHandler;
