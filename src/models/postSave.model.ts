import { IPostSave } from '#src/types/model.post.type.js';
import mongoose, { Schema } from 'mongoose';

const postSaveSchema = new Schema<IPostSave>(
  {
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

postSaveSchema.index({ postId: 1, userId: 1 }, { unique: true });

export const PostSave = mongoose.model<IPostSave>('PostSave', postSaveSchema);
