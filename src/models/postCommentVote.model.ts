import { ICommentVote } from '#src/types/model.post.type.js';
import { VOTE_TYPES } from '@vin51435/studenhub-contracts';
import mongoose, { Schema } from 'mongoose';

const commentVoteSchema = new Schema<ICommentVote>(
  {
    commentId: { type: Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    voteType: { type: String, enum: Object.values(VOTE_TYPES), required: true },
  },
  { timestamps: true }
);

commentVoteSchema.index({ commentId: 1, userId: 1 }, { unique: true });

export const CommentVote = mongoose.model('CommentVote', commentVoteSchema, 'postcommentvotes');
