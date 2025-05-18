import { IPostComment } from '#src/types/model.post.type.js';
import mongoose, { Schema } from 'mongoose';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';

const commentSchema = new Schema<IPostComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    // imageUrls: [{ type: String }],
    children: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],

    childrenCount: { type: Number, default: 0, min: 0 },
    upvotesCount: { type: Number, default: 0, min: 0 },
    downvotesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.virtual('netVotes').get(function () {
  return this.upvotesCount - this.downvotesCount;
});

// Plugin for virtual fields with lean
commentSchema.plugin(mongooseLeanVirtuals);

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
