import { postPopularityQueue } from '../jobs/queues/postPopularity.queue.js';
import { postViewCleanupQueue } from '../jobs/queues/postView.queue.js';
import { testQueue } from '../jobs/queues/test.queue.js';
import { updateTaggedPostsQueue } from '../jobs/queues/updateTaggedPosts.queue.js';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter.js';
import { ExpressAdapter } from '@bull-board/express';
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
const queues = [postViewCleanupQueue, testQueue, postPopularityQueue, updateTaggedPostsQueue].map(q => new BullMQAdapter(q));
createBullBoard({
    queues,
    serverAdapter,
});
export default serverAdapter;
