import { schedulePostViewCleanup } from '#src/jobs/producers/postViewCleanup.schedule.producer.js';

await schedulePostViewCleanup(); // Schedule it once when server starts
