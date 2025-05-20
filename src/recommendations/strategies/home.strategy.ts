import appConfig from '#src/config/appConfig.js';
import { CommunityFollowedBy } from '#src/models/communityFollowedBy.model.js';
import Post from '#src/models/post.model.js';
import { PostView } from '#src/models/postView.model.js';
import { UserFollows } from '#src/models/userFollows.model.js';
import redisConnection from '#src/redis.js';

export const computeHomeFeed = async (userId: string) => {
  console.log('computing home feed for user', userId);

  if (!userId) return;

  const redisKey = `home:feed:${userId}`;
  const limit = 100;
  const createdAfter = new Date(Date.now() - appConfig.app.post.postViewExpiry);
  const redisHomeFeedExpire = 60 * 60 * 24; // 1 day

  // Fetch followed users, communities, and seen posts concurrently
  const [followingUsers, followingCommunities, seenPostIds] = await Promise.all([
    // Get IDs of users followed by the user
    UserFollows.distinct('followingUserId', { userId }),
    // Get IDs of communities followed by the user
    CommunityFollowedBy.distinct('communityId', { userId }),
    // Get IDs of posts already viewed by the user
    PostView.distinct('postId', { userId }),
  ]);

  const orConditions = [];
  if (followingUsers.length > 0) {
    orConditions.push({ authorId: { $in: followingUsers } });
  }
  if (followingCommunities.length > 0) {
    orConditions.push({ communityId: { $in: followingCommunities } });
  }

  // If neither are followed, skip computation or fetch fallback posts
  if (orConditions.length === 0) {
    console.log('No followed users or communities – skipping feed computation');
    await redisConnection.del(redisKey);
    return;
  }

  const posts = await Post.aggregate<{ _id: string }>([
    {
      $match: {
        $and: [
          { $or: orConditions },
          { _id: { $nin: seenPostIds } },
          { createdAt: { $gt: createdAfter } },
          { isDeleted: { $ne: true } },
          // { isApproved: true },
        ],
      },
    },
    { $sort: { popularityScore: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: { $toString: '$_id' },
      },
    },
  ]);

  const postIds = posts.map(p => p._id);

  // Cache in Redis
  if (postIds.length > 0) {
    await redisConnection.del(redisKey);
    await redisConnection.lpush(redisKey, ...postIds);
    await redisConnection.expire(redisKey, 86400); // 1 day
  } else {
    // optionally clear old feed to prevent stale content
    await redisConnection.del(redisKey);
  }
};

/*
if (orConditions.length === 0) {
  const fallbackPosts = await Post.aggregate([
    { $match: { createdAt: { $gt: createdAfter }, isDeleted: { $ne: true }, isApproved: true } },
    { $sort: { popularityScore: -1 } },
    { $limit: limit },
    { $project: { _id: { $toString: '$_id' } } }
  ]);
  const fallbackIds = fallbackPosts.map(p => p._id);

  if (fallbackIds.length > 0) {
    await redisConnection.del(redisKey);
    await redisConnection.lpush(redisKey, ...fallbackIds);
    await redisConnection.expire(redisKey, 86400);
  } else {
    await redisConnection.del(redisKey);
  }
  return;
}
*/
