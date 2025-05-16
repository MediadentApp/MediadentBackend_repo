import appConfig from '#src/config/appConfig.js';
import { postViewCleanupQueue } from '#src/jobs/queues/postView.queue.js';

export const schedulePostViewCleanup = async () => {
  await postViewCleanupQueue.add(
    'delete-old-postviews',
    {}, // no data needed
    {
      repeat: { every: appConfig.app.post.PostViewCleanupInterval }, // every day (in seconds)
      removeOnComplete: true,
    }
  );
};
