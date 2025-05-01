import { PostAuthorType } from "#src/types/enum.js";
import { IPost, IPostComment, IPostTag } from "#src/types/model.post.js";
import mongoose, { Schema } from "mongoose";

const postSchema: Schema<IPost> = new Schema({
    title: { type: String, required: true, trim: true, text: true },
    slug: { type: String, required: true, trim: true, unique: true },
    content: String,
    mediaUrls: [String],
    tags: [{ type: String, index: { type: 'text', exact: true } }], // !Array of tags, string or ObjecId

    PostAuthorType: PostAuthorType,
    author: {
        type: Schema.Types.ObjectId,
        index: true,
    },
    views: Number,
    likes: [String],
    likesCount: Number,
    commentsCount: Number,
    popularityScore: { type: Number, default: 0, index: true },
    isDeleted: Boolean,
    isFlagged: Boolean,
    isApproved: Boolean,
    flagReason: String
}, { timestamps: true }).index({ _id: -1 })

const Post = mongoose.model<IPost>('Post', postSchema);

const postTagsSchema: Schema<IPostTag> = new Schema({
    name: { type: String, required: true, unique: true, text: { exact: true } },
    description: String,
    usageCount: { type: Number, default: 0, index: true }
}, { timestamps: true }).index({ _id: -1 })

const PostTags = mongoose.model<IPostTag>('PostTags', postTagsSchema);

export default Post;
export { PostTags };