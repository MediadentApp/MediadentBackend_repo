import { UserFollows } from '../models/userFollows.model.js';
import User from '../models/userModel.js';
import { DebouncedMongoBatchExecutor } from '../utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';
const userServiceHandler = new DebouncedMongoBatchExecutor({
    followUserToggle: {
        create: async (data) => {
            if (!data.length)
                return;
            const createFollows = UserFollows.insertMany(data, { ordered: false });
            const countFollowersMap = data.reduce((acc, follow) => {
                const key = follow.followingUserId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const bulkFollowersOps = Object.entries(countFollowersMap).map(([followingUserId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(followingUserId) },
                    update: { $inc: { followersCount: count } },
                },
            }));
            const countFollowingsMap = data.reduce((acc, follow) => {
                const key = follow.userId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const bulkFollowingsOps = Object.entries(countFollowingsMap).map(([userId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(userId) },
                    update: { $inc: { followingsCount: count } },
                },
            }));
            const updateUser = User.bulkWrite([...bulkFollowersOps, ...bulkFollowingsOps]);
            await Promise.all([createFollows, updateUser]);
        },
        delete: async (data) => {
            if (!data.length)
                return;
            const deleteFollows = UserFollows.deleteMany({
                $or: data.map(post => ({
                    followingUserId: post.followingUserId,
                    userId: post.userId,
                })),
            });
            const countFollowersMap = data.reduce((acc, follow) => {
                const key = follow.followingUserId.toString();
                acc[key] = (acc[key] || 0) - 1;
                return acc;
            }, {});
            const bulkFollowersOps = Object.entries(countFollowersMap).map(([followingUserId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(followingUserId) },
                    update: { $inc: { followersCount: count } },
                },
            }));
            const countFollowingsMap = data.reduce((acc, follow) => {
                const key = follow.userId.toString();
                acc[key] = (acc[key] || 0) - 1;
                return acc;
            }, {});
            const bulkFollowingsOps = Object.entries(countFollowingsMap).map(([userId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(userId) },
                    update: { $inc: { followingsCount: count } },
                },
            }));
            const updateUser = User.bulkWrite([...bulkFollowingsOps, ...bulkFollowersOps]);
            return await Promise.all([deleteFollows, updateUser]);
        },
    },
    postCount: {
        create: async (data) => {
            if (!data.length)
                return;
            const operations = [{ updateMany: { filter: { _id: { $in: data } }, update: { $inc: { postsCount: 1 } } } }];
            const update = User.bulkWrite(operations);
            await Promise.all([update]);
        },
        delete: async (data) => {
            if (!data.length)
                return;
            const operations = [{ updateMany: { filter: { _id: { $in: data } }, update: { $inc: { postsCount: -1 } } } }];
            const update = User.bulkWrite(operations);
            await Promise.all([update]);
        },
    },
});
export default userServiceHandler;
