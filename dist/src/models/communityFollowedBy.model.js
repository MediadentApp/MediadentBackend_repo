import mongoose, { Schema } from 'mongoose';
const followsCommunitySchema = new Schema({
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
followsCommunitySchema.index({ communityId: 1, userId: 1 }, { unique: true });
export const CommunityFollowedBy = mongoose.model('CommunityFollowedBy', followsCommunitySchema, 'communityfollowings');
