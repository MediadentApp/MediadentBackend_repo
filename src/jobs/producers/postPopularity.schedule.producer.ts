import appConfig from '#src/config/appConfig.js';
import { postPopularityQueue } from '#src/jobs/queues/postPopularity.queue.js';

export const scheduleDailyPopularPost = async () => {
  await postPopularityQueue.upsertJobScheduler(
    `unique-daily-popular-post`,
    { pattern: appConfig.app.algoRecommendation.postPopularity.dailyCalcTimePattern },
    {
      name: 'unique-daily-popular-post',
      opts: {
        keepLogs: 2,
        removeOnComplete: true,
      },
    }
  );
};
