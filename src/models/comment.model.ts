import { IPostComment } from '#src/types/model.post.js';
import mongoose, { Schema } from 'mongoose';

const commentSchema = new Schema<IPostComment>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Comment', index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    content: { type: String, required: true },
    // imageUrls: [{ type: String }],
    children: [{ type: Schema.Types.ObjectId, ref: 'Comment' }],
    childrenCount: { type: Number, default: 0 },
    upvotesCount: { type: Number, default: 0 },
    downvotesCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Comment = mongoose.model('Comment', commentSchema);
export default Comment;
