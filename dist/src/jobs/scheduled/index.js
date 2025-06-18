import { scheduleDailyPopularPost } from '../../jobs/producers/postPopularity.schedule.producer.js';
import { schedulePostViewCleanup } from '../../jobs/producers/postViewCleanup.schedule.producer.js';
import { schedulePostRefresh } from '../../jobs/producers/updateTaggedPosts.producer.js';
schedulePostViewCleanup();
scheduleDailyPopularPost();
schedulePostRefresh();
// addTestJob({ message: 'BullMQ test message' }).then(() => {
//   console.log('✅ Test job added to test-queue');
// });
