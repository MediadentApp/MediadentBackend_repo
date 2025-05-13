import { PostAuthorType } from '#src/types/enum.js';
import { IPost, IPostTag } from '#src/types/model.post.js';
import mongoose, { Schema } from 'mongoose';

const postSchema: Schema<IPost> = new Schema(
  {
    title: { type: String, required: true, trim: true, text: true },
    slug: { type: String, required: true, trim: true, unique: true },
    content: String,
    mediaUrls: { type: [String], default: [] },
    tags: [{ type: String, index: { type: 'text', exact: true } }], // !Array of tags, string or ObjecId

    communityId: {
      type: Schema.Types.ObjectId,
      ref: 'Community',
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      index: true,
      required: true,
    },

    views: Number,
    likes: [String],
    likesCount: Number,
    commentsCount: Number,
    popularityScore: { type: Number, default: 0, index: true },
    isDeleted: Boolean,
    isFlagged: Boolean,
    isApproved: Boolean,
    flagReason: String,
  },
  { timestamps: true }
);

postSchema.pre<IPost>('save', async function (next: any) {
  if (this.tags) {
    // await PostTags.updateMany(
    //   { name: { $in: this.tags } },
    //   { $inc: { usageCount: 1 } },
    //   { upsert: true }
    // );

    this.tags = this.tags.map(tag => tag.replace(/\s+/g, ''));
  }
  next();
});

const Post = mongoose.model<IPost>('Post', postSchema);

const postTagsSchema: Schema<IPostTag> = new Schema(
  {
    name: { type: String, required: true, unique: true, text: { exact: true } },
    description: String,
    usageCount: { type: Number, default: 0, index: true },
  },
  { timestamps: true }
);

const PostTags = mongoose.model<IPostTag>('PostTags', postTagsSchema);

export default Post;
export { PostTags };
