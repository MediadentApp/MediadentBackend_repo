import Post from '../models/post.model.js';
import { DebouncedMongoBatchExecutor } from '../utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';
const CommunityCommentCountsServiceHandler = new DebouncedMongoBatchExecutor({
    communityCommentCount: {
        create: async (commentsCount) => {
            if (!commentsCount.length)
                return;
            const countMap = commentsCount.reduce((acc, comment) => {
                const key = comment.postId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const bulkOps = Object.entries(countMap).map(([postId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(postId) },
                    update: { $inc: { commentsCount: count } },
                },
            }));
            await Post.bulkWrite(bulkOps);
        },
        delete: async (commentsCount) => {
            if (!commentsCount.length)
                return;
            const countMap = commentsCount.reduce((acc, comment) => {
                const key = comment.postId.toString();
                acc[key] = (acc[key] || 0) - 1;
                return acc;
            }, {});
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
