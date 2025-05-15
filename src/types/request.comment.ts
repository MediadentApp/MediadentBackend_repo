import { VoteEnum } from '#src/types/enum.js';

export interface ICommentBody {
  parentId?: string;
  content: string;
  imageUrl?: string;
}

export interface ICommentVoteBody {
  voteType: VoteEnum;
}
