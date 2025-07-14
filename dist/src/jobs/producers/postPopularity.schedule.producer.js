import appConfig from '../../config/appConfig.js';
import { postPopularityQueue } from '../../jobs/queues/postPopularity.queue.js';
export const scheduleDailyPopularPost = async () => {
    const jobName = 'unique-daily-popular-post';
    const repeatPattern = {
        pattern: appConfig.app.algoRecommendation.postPopularity.hourlyCalcTimePattern,
    };
    try {
        // Remove existing scheduled job
        await postPopularityQueue.removeJobScheduler(jobName);
    }
    catch (err) {
        console.warn(`Could not remove existing scheduler '${jobName}':`, err.message);
    }
    // Schedule new job
    await postPopularityQueue.upsertJobScheduler(jobName, repeatPattern, {
        name: jobName,
        opts: {
            keepLogs: 2,
            removeOnComplete: true,
        },
    });
};
