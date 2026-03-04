import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { postPopularityQueue, postViewCleanupQueue, testQueue, updateTaggedPostsQueue } from './queues/index.js';

let serverAdapter: ExpressAdapter | null = null;

export function initBullBoard() {
  serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  const queues = [postViewCleanupQueue, testQueue, postPopularityQueue, updateTaggedPostsQueue].map(
    q => new BullMQAdapter(q)
  );

  createBullBoard({
    queues,
    serverAdapter,
  });

  return serverAdapter;
}

export function getBullBoardRouter() {
  if (!serverAdapter) {
    throw new Error('BullBoard not initialized');
  }
  return serverAdapter.getRouter();
}
