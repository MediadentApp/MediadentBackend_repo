import { IPost, IPostTag } from '#src/types/model.post.type.js';
import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import mongoose, { Schema } from 'mongoose';
import User from '#src/models/userModel.js';
import userServiceHandler from '#src/services/user.service.js';

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
    popularityUpdatedAt: Date,
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

// Increment postsCount on post creation
postSchema.post('save', async function (doc) {
  if (doc.authorId) {
    userServiceHandler.add({
      type: 'create',
      collectionName: 'postCount',
      id: `${doc.authorId}-${doc._id}`,
      data: doc.authorId,
    });
  }
});

// Decrement postsCount on findOneAndDelete
postSchema.post('findOneAndDelete', function (doc) {
  if (doc?.authorId) {
    userServiceHandler.add({
      type: 'delete',
      collectionName: 'postCount',
      id: `${doc.authorId}-${doc._id}`,
      data: doc.authorId,
    });
  }
});

// Decrement on document-based deleteOne
postSchema.post('deleteOne', { document: true, query: false }, function (doc) {
  if (doc?.authorId) {
    userServiceHandler.add({
      type: 'delete',
      collectionName: 'postCount',
      id: `${doc.authorId}-${doc._id}`,
      data: doc.authorId,
    });
  }
});

// Handle query-based deleteOne
// postSchema.pre('deleteOne', { document: false, query: true }, async function () {
//   const docs = await this.model.find(this.getFilter());
//   this.set('docsToDelete', docs);
// });

postSchema.post('deleteOne', { document: false, query: true }, async function () {
  const docs: any[] = this.get('docsToDelete') || [];
  for (const doc of docs) {
    if (doc?.authorId) {
      userServiceHandler.add({
        type: 'delete',
        collectionName: 'postCount',
        id: `${doc.authorId}-${doc._id}`,
        data: doc.authorId,
      });
    }
  }
});

// Handle deleteMany
// postSchema.pre('deleteMany', async function () {
//   const docs = await this.model.find(this.getFilter());
//   this.set('docsToDelete', docs);
// });

postSchema.post('deleteMany', async function () {
  const docs: any[] = this.get('docsToDelete') || [];
  for (const doc of docs) {
    if (doc?.authorId) {
      userServiceHandler.add({
        type: 'delete',
        collectionName: 'postCount',
        id: `${doc.authorId}-${doc._id}`,
        data: doc.authorId,
      });
    }
  }
});

const Post = mongoose.model<IPost>('Post', postSchema);

export default Post;
