import { VoteEnum } from '@studenhub/studenhub-contracts';

export type CommunityPostParam = {
  communityId: string;
  postId: string;
  voteType: VoteEnum;
  slug: string;
  identifier: string;
};
