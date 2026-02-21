import { VOTE_TYPES, VoteType } from '@vin51435/studenhub-contracts';
import { Types } from 'mongoose';

export const createMockPostVote = (
  postId: string | Types.ObjectId,
  userId: string | Types.ObjectId,
  voteType: VoteType = VOTE_TYPES.UPVOTE
) => ({
  postId,
  userId,
  voteType,
});
