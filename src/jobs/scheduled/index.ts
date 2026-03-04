import { scheduleDailyPopularPost } from '#src/jobs/producers/postPopularity.schedule.producer.js';
import { schedulePostViewCleanup } from '#src/jobs/producers/postViewCleanup.schedule.producer.js';
import { schedulePostRefresh } from '#src/jobs/producers/updateTaggedPosts.producer.js';

export async function initScheduledJobs() {
  await schedulePostViewCleanup();
  await scheduleDailyPopularPost();
  await schedulePostRefresh();
  // addTestJob({ message: 'BullMQ test message' }).then(() => {
  //   console.log('✅ Test job added to test-queue');
  // });

  console.log('Scheduled jobs initialized');
}
