import { IFollowsCommunity } from '#src/types/model.community.js';
import mongoose, { Schema } from 'mongoose';

const followsCommunitySchema = new Schema<IFollowsCommunity>(
  {
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

followsCommunitySchema.index({ communityId: 1, userId: 1 }, { unique: true });

export const CommunityFollowedBy = mongoose.model<IFollowsCommunity>(
  'CommunityFollowedBy',
  followsCommunitySchema,
  'communityfollowings'
);
