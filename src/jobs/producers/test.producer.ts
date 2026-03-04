import { testQueue } from '../queues/index.js';

export const addTestJob = async (data: { message: string }) => {
  await testQueue.add('log-message', data, {
    removeOnComplete: true,
    delay: 1000, // optional delay
  });
};
