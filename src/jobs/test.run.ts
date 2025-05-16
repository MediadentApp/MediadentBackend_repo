import { addTestJob } from '#src/jobs/producers/test.producer.js';

addTestJob({ message: 'BullMQ test message' }).then(() => {
  console.log('✅ Test job added to test-queue');
});
