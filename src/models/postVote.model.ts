import { VoteEnum } from '#src/types/enum.js';
import { IPostVote } from '#src/types/model.post.js';
import mongoose, { Schema } from 'mongoose';

const postVoteSchema = new Schema<IPostVote>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    voteType: { type: String, enum: VoteEnum, required: true },
  },
  { timestamps: true }
);

postVoteSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostVote = mongoose.model<IPostVote>('PostVote', postVoteSchema);
