import appConfig from '../../config/appConfig.js';
import { postViewCleanupQueue } from '../../jobs/queues/postView.queue.js';
export const schedulePostViewCleanup = async () => {
    await postViewCleanupQueue.upsertJobScheduler(`delete-old-postviews`, { pattern: appConfig.app.algoRecommendation.postViewCleanup.dailyCleanTimePattern }, {
        name: 'delete-old-postviews',
        opts: {
            keepLogs: 2,
            removeOnComplete: true,
        },
    });
};
