import appConfig from '../../config/appConfig.js';
import { updateTaggedPostsQueue } from '../../jobs/queues/updateTaggedPosts.queue.js';
export async function schedulePostRefresh() {
    await updateTaggedPostsQueue.obliterate({ force: true });
    await updateTaggedPostsQueue.upsertJobScheduler('refreshPosts', {
        pattern: appConfig.app.algoRecommendation.refreshPosts.hourlyRefreshTimePattern,
    }, {
        name: 'refreshPosts',
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
