import { VoteEnum } from '../types/enum.js';
import mongoose, { Schema } from 'mongoose';
const commentVoteSchema = new Schema({
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    voteType: { type: String, enum: VoteEnum, required: true },
}, { timestamps: true });
commentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });
export const CommentVote = mongoose.model('CommentVote', commentVoteSchema, 'postcommentvotes');
