import { VoteEnum } from '@vin51435/studenhub-contracts';

export type CommentParam = {
  postId: string;
  commentId: string;
  voteType: VoteEnum;
};
