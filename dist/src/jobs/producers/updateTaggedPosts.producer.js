import appConfig from '../../config/appConfig.js';
import { updateTaggedPostsQueue } from '../../jobs/queues/updateTaggedPosts.queue.js';
export async function schedulePostRefresh() {
    const jobName = 'refreshPosts';
    const repeatPattern = {
        pattern: appConfig.app.algoRecommendation.refreshPosts.hourlyRefreshTimePattern,
    };
    try {
        await updateTaggedPostsQueue.removeJobScheduler(jobName);
    }
    catch (err) {
        console.warn(`Could not remove existing scheduler '${jobName}':`, err.message);
    }
    await updateTaggedPostsQueue.upsertJobScheduler(jobName, repeatPattern, {
        name: jobName,
        data: {
            keywords: ['refresh'],
            batchSize: 50,
        },
        opts: {
            keepLogs: 2,
            removeOnComplete: true,
        },
    });
}
