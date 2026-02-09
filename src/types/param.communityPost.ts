import { VoteEnum } from '@vin51435/studenhub-contracts';

export type CommunityPostParam = {
  communityId: string;
  postId: string;
  voteType: VoteEnum;
  slug: string;
  identifier: string;
};
