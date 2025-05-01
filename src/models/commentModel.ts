import { IPostComment } from "#src/types/model.post.js";
import mongoose, { Schema } from "mongoose";

const commentSchema: Schema<IPostComment> = new Schema({
    postId: {
        type: Schema.Types.ObjectId,
        ref: 'Post',
        required: true,
        index: true
    },
    parentId: {
        type: Schema.Types.ObjectId,
        ref: 'Comment',
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    content: { type: String, required: true },
    likes: [String],
    likesCount: Number,
    children: [this],
    childrenCount: Number
}, { timestamps: true })

const Comment = mongoose.model('Comment', commentSchema)
export default Comment