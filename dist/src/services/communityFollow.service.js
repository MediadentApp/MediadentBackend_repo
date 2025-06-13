import Community from '../models/community.model.js';
import { CommunityFollowedBy } from '../models/communityFollowedBy.model.js';
import User from '../models/userModel.js';
import { DebouncedMongoBatchExecutor } from '../utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';
const followCommunityServiceHandler = new DebouncedMongoBatchExecutor({
    CommunityFollowedBy: {
        create: async (follows) => {
            if (!follows.length)
                return;
            const createCommunityFollows = CommunityFollowedBy.insertMany(follows, { ordered: false });
            // Count how many follows per community
            const countMap = follows.reduce((acc, follow) => {
                const key = follow.communityId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const communityBulkOps = Object.entries(countMap).map(([communityId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(communityId) },
                    update: { $inc: { followersCount: count } },
                },
            }));
            // Count how many follows per user
            const countUserMap = follows.reduce((acc, follow) => {
                const key = follow.userId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const userBulkOps = Object.entries(countUserMap).map(([userId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(userId) },
                    update: { $inc: { followingCommunitiesCount: count } },
                },
            }));
            // Perform both bulk writes in parallel
            await Promise.all([
                createCommunityFollows,
                communityBulkOps.length ? Community.bulkWrite(communityBulkOps) : null,
                userBulkOps.length ? User.bulkWrite(userBulkOps) : null,
            ]);
        },
        delete: async (follows) => {
            if (!follows.length)
                return;
            // 1. Delete documents
            const deletePromise = CommunityFollowedBy.deleteMany({
                $or: follows.map(post => ({
                    communityId: post.communityId,
                    userId: post.userId,
                })),
            });
            // 2. Count deletes per community
            const countMap = follows.reduce((acc, follow) => {
                const key = follow.communityId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const communityBulkOps = Object.entries(countMap).map(([communityId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(communityId) },
                    update: { $inc: { followersCount: -count } },
                },
            }));
            // 3. Count deletes per user
            const countUserMap = follows.reduce((acc, follow) => {
                const key = follow.userId.toString();
                acc[key] = (acc[key] || 0) + 1;
                return acc;
            }, {});
            const userBulkOps = Object.entries(countUserMap).map(([userId, count]) => ({
                updateOne: {
                    filter: { _id: new mongoose.Types.ObjectId(userId) },
                    update: { $inc: { followingCommunitiesCount: -count } },
                },
            }));
            // 4. Run all operations in parallel
            const [res] = await Promise.all([
                deletePromise,
                communityBulkOps.length ? Community.bulkWrite(communityBulkOps) : null,
                userBulkOps.length ? User.bulkWrite(userBulkOps) : null,
            ]);
            return res;
        },
    },
});
export default followCommunityServiceHandler;
