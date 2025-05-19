import { faker } from '@faker-js/faker';
import { Types } from 'mongoose';

export const createMockPost = (overrides = {}) => {
  const communityId = new Types.ObjectId();
  const authorId = new Types.ObjectId();

  return {
    title: faker.lorem.sentence(),
    slug: faker.helpers.slugify(faker.lorem.sentence()).toLowerCase(),
    content: faker.lorem.paragraphs(2),
    mediaUrls: [faker.image.url()],
    tags: faker.helpers.arrayElements(['tech', 'js', 'design', 'ai'], 2),

    communityId,
    authorId,

    views: faker.number.int({ min: 0, max: 1000 }),
    upvotesCount: faker.number.int({ min: 0, max: 100 }),
    downvotesCount: faker.number.int({ min: 0, max: 50 }),
    commentsCount: faker.number.int({ min: 0, max: 30 }),
    savesCount: faker.number.int({ min: 0, max: 20 }),

    popularityScore: faker.number.float({ min: 0, max: 100 }),
    isDeleted: false,
    isFlagged: false,
    isApproved: true,
    flagReason: '',

    ...overrides,
  };
};
