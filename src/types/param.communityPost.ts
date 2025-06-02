import { VoteEnum } from '#src/types/enum.js';

export type CommunityPostParam = {
  communityId: string;
  postId: string;
  voteType: VoteEnum;
  slug: string;
  identifier: string;
};
