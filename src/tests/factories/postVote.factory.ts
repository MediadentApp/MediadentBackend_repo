import { VoteEnum } from '#src/types/enum.js';
import { Types } from 'mongoose';

export const createMockPostVote = (
  postId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
  voteType: VoteEnum = VoteEnum.upVote
) => ({
  postId,
  userId,
  voteType,
});
