import Post from '#src/models/post.model.js';
import { PostSave } from '#src/models/postSave.model.js';
import { PostView } from '#src/models/postView.model.js';
import { PostVote } from '#src/models/postVote.model.js';
import { createMockPost } from '#src/tests/factories/post.factory.js';
import { createMockPostSave } from '#src/tests/factories/postSave.factory.js';
import { createMockPostView } from '#src/tests/factories/postView.factory.js';
import { createMockPostVote } from '#src/tests/factories/postVote.factory.js';
import { getObjectIds } from '#src/tests/unit/utils/ojbectId.js';
import { VoteEnum } from '#src/types/enum.js';
import { expect, test } from 'vitest';

test.skip('popularity calculation with mock posts', async () => {
  // Create posts in the in-memory DB
  const post1 = await Post.create(createMockPost({ views: 100, upvotesCount: 10 }));
  const post = await Post.create(createMockPost());

  await PostView.create(createMockPostView(post._id.toString(), getObjectIds()));
  await PostVote.create(createMockPostVote(post._id.toString(), getObjectIds(), VoteEnum.upVote));
  await PostSave.create(createMockPostSave(post._id.toString(), getObjectIds()));

  const post2 = await Post.create(createMockPost({ views: 5, upvotesCount: 1 }));

  // Run your popularity calculation logic here, which queries DB
  // const results = await getPopularPosts();

  console.log('post1', post1);
  console.log('post2', post2);
  console.log('post views', await PostView.find());
  console.log('post saves', await PostSave.find());
  console.log('post votes', await PostVote.find());
});
