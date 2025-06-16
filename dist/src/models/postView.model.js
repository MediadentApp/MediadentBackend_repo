import mongoose, { Schema } from 'mongoose';
const postViewSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    viewedAt: { type: Date, default: Date.now },
});
postViewSchema.index({ postId: 1, userId: 1 }, { unique: true });
export const PostView = mongoose.model('PostView', postViewSchema);
