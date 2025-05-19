import { scheduleDailyPopularPost } from '#src/jobs/producers/postPopularity.schedule.producer.js';
import { schedulePostViewCleanup } from '#src/jobs/producers/postViewCleanup.schedule.producer.js';

schedulePostViewCleanup();
scheduleDailyPopularPost();
