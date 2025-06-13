import Post from '../models/post.model.js';
import { PostSave } from '../models/postSave.model.js';
import { DebouncedMongoBatchExecutor } from '../utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';
const postSaveServiceHandler = new DebouncedMongoBatchExecutor({
    SavedPost: {
        create: async (savedPosts) => {
            if (!savedPosts.length)
                return;
            // No need to await, as response is ignored
            const savePost = PostSave.insertMany(savedPosts, { ordered: false });
            const countMap = savedPosts.reduce((acc, post) => {
                const key = post.postId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const bulkOps = Object.entries(countMap).map(([postId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(postId) },
                    update: { $inc: { savesCount: count } },
                },
            }));
            await Promise.all([savePost, bulkOps.length ? Post.bulkWrite(bulkOps) : null]);
        },
        delete: async (savedPosts) => {
            if (!savedPosts.length)
                return;
            // No need to await, as response is ignored
            const deleteSavePost = PostSave.deleteMany({
                $or: savedPosts.map(post => ({
                    postId: post.postId,
                    userId: post.userId,
                })),
            });
            const countMap = savedPosts.reduce((acc, post) => {
                const key = post.postId.toString();
                acc[key] = (acc[key] || 0) - 1;
                return acc;
            }, {});
            const bulkOps = Object.entries(countMap).map(([postId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(postId) },
                    update: { $inc: { savesCount: count } },
                },
            }));
            await Promise.all([deleteSavePost, bulkOps.length ? Post.bulkWrite(bulkOps) : null]);
        },
    },
});
export default postSaveServiceHandler;
