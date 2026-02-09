import { IPostVote } from '#src/types/model.post.type.js';
import { VOTE_TYPES } from '@vin51435/studenhub-contracts';
import mongoose, { Schema } from 'mongoose';

const postVoteSchema = new Schema<IPostVote>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voteType: { type: String, enum: Object.values(VOTE_TYPES), required: true },
  },
  { timestamps: true }
);

postVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostVote = mongoose.model<IPostVote>('PostVote', postVoteSchema);
