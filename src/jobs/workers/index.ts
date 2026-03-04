import { initPostPopularityWorker } from './postPopularity.worker.js';
import { initPostViewWorker } from './postView.worker.js';
import { initRefreshPostsWorker } from './refreshPosts.worker.js';
import { initTestWorker } from './test.worker.js';

export function initWorkders() {
  initTestWorker();
  initPostPopularityWorker();
  initPostViewWorker();
  initRefreshPostsWorker();

  console.log('Workers initialized');
}
