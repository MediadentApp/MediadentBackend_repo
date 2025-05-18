import Post from '#src/models/post.model.js';
import { IPostComment } from '#src/types/model.post.type.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';

export interface CommentCount extends Pick<IPostComment, 'postId' | 'userId'> {}

const CommunityCommentCountsServiceHandler = new DebouncedMongoBatchExecutor({
  communityCommentCount: {
    create: async (commentsCount: CommentCount[]) => {
      if (!commentsCount.length) return;

      const countMap = commentsCount.reduce(
        (acc, comment) => {
          const key = comment.postId.toString();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const bulkOps = Object.entries(countMap).map(([postId, count]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(postId) },
          update: { $inc: { commentsCount: count } },
        },
      }));

      await Post.bulkWrite(bulkOps);
    },

    delete: async (commentsCount: CommentCount[]) => {
      if (!commentsCount.length) return;

      const countMap = commentsCount.reduce(
        (acc, comment) => {
          const key = comment.postId.toString();
          acc[key] = (acc[key] || 0) - 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const bulkOps = Object.entries(countMap).map(([postId, count]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(postId) },
          update: { $inc: { commentsCount: count } },
        },
      }));

      await Post.bulkWrite(bulkOps);
    },
  },
});

export default CommunityCommentCountsServiceHandler;
