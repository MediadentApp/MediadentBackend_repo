import { UserFollows } from '#src/models/userFollows.model.js';
import User from '#src/models/userModel.js';
import { IUserFollows } from '#src/types/model.js';
import { DebouncedMongoBatchExecutor } from '#src/utils/DebounceMongoBatchExecutor.js';
import mongoose from 'mongoose';

const followUserServiceHandler = new DebouncedMongoBatchExecutor({
  followUserToggle: {
    create: async (data: IUserFollows[]) => {
      if (!data.length) return;

      const createFollows = UserFollows.insertMany(data, { ordered: false });

      const countFollowersMap = data.reduce(
        (acc, follow) => {
          const key = follow.followingUserId.toString();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const bulkFollowersOps = Object.entries(countFollowersMap).map(([followingUserId, count]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(followingUserId) },
          update: { $inc: { followersCount: count } },
        },
      }));

      const countFollowingsMap = data.reduce(
        (acc, follow) => {
          const key = follow.userId.toString();
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const bulkFollowingsOps = Object.entries(countFollowingsMap).map(([userId, count]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(userId) },
          update: { $inc: { followingsCount: count } },
        },
      }));

      const updateUser = User.bulkWrite([...bulkFollowersOps, ...bulkFollowingsOps]);

      return await Promise.all([createFollows, updateUser]);
    },
    delete: async (data: IUserFollows[]) => {
      if (!data.length) return;

      const deleteFollows = UserFollows.deleteMany({
        $or: data.map(post => ({
          followingUserId: post.followingUserId,
          userId: post.userId,
        })),
      });

      const countFollowersMap = data.reduce(
        (acc, follow) => {
          const key = follow.followingUserId.toString();
          acc[key] = (acc[key] || 0) - 1;
          return acc;
        },
        {} as Record<string, number>
      );

      const bulkFollowersOps = Object.entries(countFollowersMap).map(([followingUserId, count]) => ({
        updateOne: {
          filter: { _id: new mongoose.Types.ObjectId(followingUserId) },
          update: { $inc: { followersCount: count } },
        },
      }));

      const countFollowingsMap = data.reduce(
        (acc, follow) => {
          const key = follow.userId.toString();
          acc[key] = (acc[key] || 0) - 1;
          return acc;
        },
        {} as Record<string, number>
      );

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
});

export default followUserServiceHandler;
