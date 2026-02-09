import { VoteEnum } from '@vin51435/studenhub-contracts';

export interface ICommentBody {
  parentId?: string;
  content: string;
  imageUrl?: string;
}

export interface ICommentVoteBody {
  voteType: VoteEnum;
}
