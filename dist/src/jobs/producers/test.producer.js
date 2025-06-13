import { testQueue } from '../../jobs/queues/test.queue.js';
export const addTestJob = async (data) => {
    await testQueue.add('log-message', data, {
        removeOnComplete: true,
        delay: 1000, // optional delay
    });
};
