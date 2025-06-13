import mongoose, { Schema } from 'mongoose';
// Tags Schema
const postTagsSchema = new Schema({
    name: { type: String, required: true, unique: true, text: { exact: true } },
    description: String,
    usageCount: { type: Number, default: 0, index: true },
}, { timestamps: true });
const PostTags = mongoose.model('PostTags', postTagsSchema);
export default PostTags;
