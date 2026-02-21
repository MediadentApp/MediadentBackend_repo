import { ICommunity } from '#src/types/model.community.js';

export type ICommunityBodyDTO = Pick<
  ICommunity,
  | 'name'
  | 'description'
  | 'parentId'
  | 'type'
  | 'moderators'
  | 'bannedUsers'
  | 'blockedUsers'
  | 'mutedUsers'
  | 'invitedUsers'
>;
