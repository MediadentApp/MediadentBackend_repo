import { VoteEnum } from '../types/enum.js';
import mongoose, { Schema } from 'mongoose';
const postVoteSchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voteType: { type: String, enum: VoteEnum, required: true },
}, { timestamps: true });
postVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });
export const PostVote = mongoose.model('PostVote', postVoteSchema);
