import { describe, beforeAll, afterAll, beforeEach, it, expect } from 'vitest';
import mongoose from 'mongoose';

import Post from '#src/models/post.model.js';
import Comment from '#src/models/postComment.model.js';
import { PostSave } from '#src/models/postSave.model.js';
import { PostView } from '#src/models/postView.model.js';
import { PostVote } from '#src/models/postVote.model.js';
import { VoteEnum } from '#src/types/enum.js';
import postPopularityStrategy from '#src/recommendations/strategies/postPopularity.strategy.js';
import { getObjectIds } from '#src/tests/unit/utils/ojbectId.js';

describe('postPopularityStrategy - multiple scenarios', () => {
  // beforeEach(async () => {
  //   await Promise.all(Object.values(mongoose.connection.collections).map(collection => collection.deleteMany({})));
  // });

  const createPostWithInteractions = async ({
    views = 0,
    upvotes = 0,
    downvotes = 0,
    comments = 0,
    saves = 0,
    hoursAgo = 2,
    title = 'Post',
  }) => {
    const now = new Date();
    const post = await Post.create({
      title,
      slug: `post-${Math.random().toString(36).substring(7)}`,
      content: 'Content',
      tags: ['tag'],
      authorId: new mongoose.Types.ObjectId(),
      views,
      upvotesCount: upvotes,
      downvotesCount: downvotes,
      commentsCount: comments,
      savesCount: saves,
      createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
    });

    const users = getObjectIds(views + upvotes + downvotes + comments + saves + 5);

    await PostView.insertMany(users.slice(0, views).map(userId => ({ userId, postId: post._id })));

    await PostVote.insertMany([
      ...users.slice(views, views + upvotes).map(userId => ({
        postId: post._id,
        userId,
        voteType: VoteEnum.upVote,
      })),
      ...users.slice(views + upvotes, views + upvotes + downvotes).map(userId => ({
        postId: post._id,
        userId,
        voteType: VoteEnum.downVote,
      })),
    ]);

    await Comment.insertMany(
      users.slice(0, comments).map(userId => ({
        postId: post._id,
        userId,
        content: 'Comment',
      }))
    );

    await PostSave.insertMany(
      users.slice(0, saves).map(userId => ({
        postId: post._id,
        userId,
      }))
    );

    return post;
  };

  describe('handles a popular post with many interactions', () => {
    it('should give high score', async () => {
      const post = await createPostWithInteractions({
        title: 'handles a popular post with many interactions, should give high score',
        views: 100,
        upvotes: 20,
        downvotes: 5,
        comments: 15,
        saves: 10,
      });

      await postPopularityStrategy();
      const updated = await Post.findById(post._id);

      expect(updated?.popularityScore).toBeGreaterThan(0);
    });
  });

  describe('handles a post with no interactions', () => {
    describe('but it\ss 1 hour old', () => {
      it('should give a boost', async () => {
        const post = await createPostWithInteractions({
          title: 'handles a post with no interactions but is 1 hour old, should give low score',
          hoursAgo: 1,
        });

        await postPopularityStrategy();
        const updated = await Post.findById(post._id);

        expect(updated?.popularityScore).toBeGreaterThan(0);
      });
    });

    describe('but it\s 1 day old', () => {
      it('should give low score', async () => {
        const post = await createPostWithInteractions({
          title: 'handles a post with no interactions but is 1 day old, should give lower score',
          hoursAgo: 24,
        });

        await postPopularityStrategy();
        const updated = await Post.findById(post._id);

        expect(updated?.popularityScore).toBe(0);
      });
    });
  });

  describe('handles a new post with few interactions', async () => {
    it('should give low score', async () => {
      const post = await createPostWithInteractions({
        title: 'handles a new post with few interactions, should give low score',
        views: 2,
        upvotes: 1,
        comments: 1,
        saves: 1,
        hoursAgo: 1,
      });

      await postPopularityStrategy();
      const updated = await Post.findById(post._id);

      expect(updated?.popularityScore).toBeGreaterThan(0);
    });
  });

  describe('handles an post with lots of interactions', async () => {
    const metaData = {
      views: 100,
      upvotes: 30,
      downvotes: 10,
      comments: 20,
      saves: 15,
    };

    describe('1 hour decay', () => {
      it('should give high score', async () => {
        const post = await createPostWithInteractions({
          title: 'handles an post with lots of interactions, should give high score',
          ...metaData,
          hoursAgo: 2,
        });

        await postPopularityStrategy();
        const updated = await Post.findById(post._id);

        expect(updated?.popularityScore).toBeGreaterThan(20);
      });
    });

    describe('30 day decay', () => {
      it('should give lower score', async () => {
        const post = await createPostWithInteractions({
          title: 'handles an 30 day old post with lots of interactions, should give lower score',
          ...metaData,
          hoursAgo: 24 * 30, // 30 days old
        });

        await postPopularityStrategy();
        const updated = await Post.findById(post._id);

        expect(updated?.popularityScore).toBeLessThan(5); // Strong decay
      });
    });
  });

  describe('handles posts with only downvotes', async () => {
    it('should give negative score', async () => {
      const post = await createPostWithInteractions({
        title: 'handles posts with only downvotes, should give negative score',
        downvotes: 10,
      });

      await postPopularityStrategy();
      const updated = await Post.findById(post._id);

      expect(updated?.popularityScore).toBeLessThanOrEqual(0);
    });
  });
});
