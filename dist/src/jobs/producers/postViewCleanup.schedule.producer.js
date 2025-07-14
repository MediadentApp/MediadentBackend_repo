import appConfig from '../../config/appConfig.js';
import { postViewCleanupQueue } from '../../jobs/queues/postView.queue.js';
export const schedulePostViewCleanup = async () => {
    const jobName = 'delete-old-postviews';
    const repeatPattern = {
        pattern: appConfig.app.algoRecommendation.postViewCleanup.dailyCleanTimePattern,
    };
    try {
        await postViewCleanupQueue.removeJobScheduler(jobName);
    }
    catch (err) {
        console.warn(`Could not remove existing scheduler '${jobName}':`, err.message);
    }
    await postViewCleanupQueue.upsertJobScheduler(jobName, repeatPattern, {
        name: jobName,
        opts: {
            keepLogs: 2,
            removeOnComplete: true,
        },
    });
};
