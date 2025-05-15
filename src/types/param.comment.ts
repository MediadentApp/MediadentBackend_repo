import { VoteEnum } from '#src/types/enum.js';

export type CommentParam = {
  postId: string;
  commentId: string;
  voteType: VoteEnum;
};
