import { scheduleDailyPopularPost } from '../../jobs/producers/postPopularity.schedule.producer.js';
import { schedulePostViewCleanup } from '../../jobs/producers/postViewCleanup.schedule.producer.js';
schedulePostViewCleanup();
scheduleDailyPopularPost();
