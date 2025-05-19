import appConfig from '#src/config/appConfig.js';
import Post from '#src/models/post.model.js';

/**
 * Recalculates the popularity score of all posts created in the last 30 days
 * using a time-decayed formula based on user interactions.
 *
 * The score is computed as:
 *    (views + 5*upvotes - 2*downvotes + 4*comments + 6*saves) * decay
 *
 * The decay function is:
 *    decay = 1 / (hoursSinceCreated + 2) ^ 1.5
 * This ensures newer posts are more visible, while older ones decay gradually.
 *
 * Popularity is updated in batches of 50 using bulkWrite.
 */
const postPopularityStrategy = async () => {
  const thresholdDate = new Date(Date.now() - appConfig.app.algoRecommendation.postPopularity.thresholdDate); // 30 days
  const BATCH_SIZE = 50;
  let skip = 0;
  let hasMore = true;

  while (hasMore) {
    const posts = await Post.find({ createdAt: { $gte: thresholdDate } })
      .skip(skip)
      .limit(BATCH_SIZE);

    if (posts.length === 0) {
      hasMore = false;
      break;
    }

    const updates = await Promise.all(
      posts.map(async post => {
        const {
          views,
          upvotesCount: upvotes,
          downvotesCount: downvotes,
          commentsCount: comments,
          savesCount: saves,
        } = post;

        const hoursSinceCreated = (Date.now() - post.createdAt.getTime()) / (1000 * 60 * 60);

        const decay = 1 / Math.pow(hoursSinceCreated + 2, 1.5);
        const baseScore = views + upvotes * 5 + downvotes * -2 + comments * 4 + saves * 6;
        let finalScore = baseScore * decay;

        // Boost very recent posts (under 6 hours old)
        if (hoursSinceCreated < 6) {
          finalScore = (finalScore + 1) * 2;
        }

        return {
          updateOne: {
            filter: { _id: post._id },
            update: {
              $set: {
                popularityScore: finalScore,
                popularityUpdatedAt: new Date(),
              },
            },
          },
        };
      })
    );

    await Post.bulkWrite(updates);
    skip += BATCH_SIZE;
  }

  console.log(`✅ Popularity score recalculated for posts more than ${skip * BATCH_SIZE - BATCH_SIZE}`);
};

export default postPopularityStrategy;
