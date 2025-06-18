import appConfig from '#src/config/appConfig.js';
import { updateTaggedPostsQueue } from '#src/jobs/queues/updateTaggedPosts.queue.js';

export async function schedulePostRefresh() {
  await updateTaggedPostsQueue.obliterate({ force: true });
  await updateTaggedPostsQueue.upsertJobScheduler(
    'refreshPosts',
    {
      pattern: appConfig.app.algoRecommendation.refreshPosts.hourlyRefreshTimePattern,
    },
    {
      name: 'refreshPosts',
      data: {
        keywords: ['refresh'],
        batchSize: 50,
      },
      opts: {
        keepLogs: 2,
        removeOnComplete: true,
      },
    }
  );
}
