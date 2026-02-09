import { VoteEnum } from '@studenhub/studenhub-contracts';

export type CommentParam = {
  postId: string;
  commentId: string;
  voteType: VoteEnum;
};
