import Post from '#src/models/post.model.js';
import { PostView } from '#src/models/postView.model.js';
import redisConnection from '#src/redis.js';
import { Worker } from 'bullmq';

export const refreshPostsWorker = new Worker(
  'refreshPosts',
  async job => {
    const { keywords, batchSize } = job.data;

    const posts = await Post.find({
      tags: { $in: keywords },
      isDeleted: { $ne: true },
    })
      .limit(batchSize)
      .lean();

    if (!posts.length) return { updated: 0, droppedPostViews: false };

    // Prepare bulk updates
    const bulkOps = posts.map(post => {
      const randomUpvotes = Math.floor(Math.random() * 500);
      const randomDownvotes = Math.floor(Math.random() * 100);
      const randomViews = Math.floor(Math.random() * 1000) + randomDownvotes + randomUpvotes;
      const randomDaysAgo = Math.floor(Math.random() * 6);
      const randomDate = new Date(Date.now() - randomDaysAgo * 24 * 60 * 60 * 1000);

      return {
        updateOne: {
          filter: { _id: post._id },
          update: {
            $set: {
              views: randomViews,
              upvotesCount: randomUpvotes,
              downvotesCount: randomDownvotes,
              createdAt: randomDate,
              updatedAt: new Date(),
            },
          },
        },
      };
    });

    await Post.collection.bulkWrite(bulkOps);

    // Drop PostView collection
    const dropResult = await PostView.collection.drop().then(
      () => true,
      (err: any) => {
        if (err.code === 26) return false;
        throw err;
      }
    );

    return { updated: posts.length, droppedPostViews: dropResult };
  },
  { connection: redisConnection }
);

// Log results
refreshPostsWorker.on('completed', job => {
  console.log(
    `Job ${job.id} completed. Updated: ${job.returnvalue.updated}, Dropped PostViews: ${job.returnvalue.droppedPostViews}`
  );
});

refreshPostsWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

refreshPostsWorker.on('error', err => console.error('Queue error', err));
