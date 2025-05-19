import { IPostView } from '#src/types/model.post.type.js';
import mongoose, { Schema } from 'mongoose';

const postViewSchema = new Schema<IPostView>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
  viewedAt: { type: Date, default: Date.now },
});

postViewSchema.index({ userId: 1, postId: 1 });

export const PostView = mongoose.model<IPostView>('PostView', postViewSchema);
