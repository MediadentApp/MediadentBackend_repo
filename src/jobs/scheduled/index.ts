import { scheduleDailyPopularPost } from '#src/jobs/producers/postPopularity.schedule.producer.js';
import { schedulePostViewCleanup } from '#src/jobs/producers/postViewCleanup.schedule.producer.js';
import { addTestJob } from '#src/jobs/producers/test.producer.js';
import { schedulePostRefresh } from '#src/jobs/producers/updateTaggedPosts.producer.js';

schedulePostViewCleanup();
scheduleDailyPopularPost();
schedulePostRefresh();
// addTestJob({ message: 'BullMQ test message' }).then(() => {
//   console.log('✅ Test job added to test-queue');
// });
