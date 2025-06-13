import mongoose, { Schema } from 'mongoose';
const userFollowsSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    followingUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
userFollowsSchema.index({ followerId: 1, followingUserId: 1 }, { unique: true });
export const UserFollows = mongoose.model('UserFollows', userFollowsSchema, 'userfollowings');
