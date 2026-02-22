import Post from '#src/models/post.model.js';
import { PostView } from '#src/models/postView.model.js';
import { getRedis } from '#src/config/redis.js';
import { Worker } from 'bullmq';

let refreshPostsWorker: Worker;

export function initRefreshPostsWorker() {
  const connection = getRedis();

  refreshPostsWorker = new Worker(
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

      const bulkOps = posts.map(post => {
        const randomUpvotes = Math.floor(Math.random() * 500);
        const randomDownvotes = Math.floor(Math.random() * 100);
        const randomViews = Math.floor(Math.random() * 1000) + randomUpvotes + randomDownvotes;

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

      const dropResult = await PostView.collection.drop().then(
        () => true,
        (err: any) => {
          if (err.code === 26) return false;
          throw err;
        }
      );

      return { updated: posts.length, droppedPostViews: dropResult };
    },
    { connection }
  );

  // Attach listeners AFTER creation
  refreshPostsWorker.on('completed', job => {
    console.log(
      `Job ${job.id} completed. Updated: ${job.returnvalue.updated}, Dropped PostViews: ${job.returnvalue.droppedPostViews}`
    );
  });

  refreshPostsWorker.on('failed', (job, err) => {
    console.error(`Job ${job?.id} failed:`, err);
  });

  refreshPostsWorker.on('error', err => {
    console.error('Queue error', err);
  });
}

export function getRefreshPostsWorker() {
  if (!refreshPostsWorker) {
    throw new Error('Worker not initialized');
  }
  return refreshPostsWorker;
}

export async function shutdownRefreshPostsWorker() {
  await refreshPostsWorker?.close();
}
