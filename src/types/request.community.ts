import { ICommunity } from '#src/types/model.community.js';

export interface ICommunityBody
  extends Pick<
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
  > {}
