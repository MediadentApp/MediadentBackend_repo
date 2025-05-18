import { IPost, IPostTag } from '#src/types/model.post.type.js';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import mongoose, { Schema } from 'mongoose';

const postSchema: Schema<IPost> = new Schema(
  {
    title: { type: String, required: true, trim: true, text: true },
    slug: { type: String, required: true, trim: true, unique: true, immutable: true },
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

    views: { type: Number, default: 0, min: 0 },
    upvotesCount: { type: Number, default: 0, min: 0 },
    downvotesCount: { type: Number, default: 0, min: 0 },
    commentsCount: { type: Number, default: 0, min: 0 },
    savesCount: { type: Number, default: 0, min: 0 },

    popularityScore: { type: Number, default: 0, index: true },
    isDeleted: Boolean,
    isFlagged: Boolean,
    isApproved: Boolean,
    flagReason: String,
  },
  { timestamps: true }
);

postSchema.virtual('netVotes').get(function () {
  return this.upvotesCount - this.downvotesCount;
});

// Plugin for virtual fields with lean
postSchema.plugin(mongooseLeanVirtuals);

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

// Tags Schema
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
