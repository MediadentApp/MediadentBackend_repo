import mongooseLeanVirtuals from 'mongoose-lean-virtuals';
import mongoose, { Schema } from 'mongoose';
import userServiceHandler from '../services/user.service.js';
import { deleteImagesFromS3 } from '../libs/s3.js';
const postSchema = new Schema({
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
        ref: 'User',
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
}, { timestamps: true });
postSchema.virtual('netVotes').get(function () {
    return this.upvotesCount - this.downvotesCount;
});
// Plugin for virtual fields with lean
postSchema.plugin(mongooseLeanVirtuals);
postSchema.pre('save', async function (next) {
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
function deleteMediaUrls(post) {
    if (post.mediaUrls) {
        deleteImagesFromS3(post.mediaUrls);
    }
}
function incUserPostCount(post) {
    if (post?.authorId) {
        userServiceHandler.add({
            type: 'create',
            collectionName: 'postCount',
            id: `${post.authorId}-${post._id}`,
            data: post.authorId,
        });
    }
}
function decUserPostCount(post) {
    if (post?.authorId) {
        userServiceHandler.add({
            type: 'delete',
            collectionName: 'postCount',
            id: `${post.authorId}-${post._id}`,
            data: post.authorId,
        });
    }
}
// Increment postsCount on post creation
postSchema.post('save', async function (doc) {
    incUserPostCount(doc);
});
// Decrement postsCount on findOneAndDelete
postSchema.post('findOneAndDelete', function (doc) {
    decUserPostCount(doc);
    deleteMediaUrls(doc);
});
// Decrement on document-based deleteOne
postSchema.post('deleteOne', { document: true, query: false }, function (doc) {
    decUserPostCount(doc);
    deleteMediaUrls(doc);
});
// Handle query-based deleteOne
// postSchema.pre('deleteOne', { document: false, query: true }, async function () {
//   const docs = await this.model.find(this.getFilter());
//   this.set('docsToDelete', docs);
// });
// Handle deleteMany
// postSchema.pre('deleteMany', async function () {
//   const docs = await this.model.find(this.getFilter());
//   this.set('docsToDelete', docs);
// });
postSchema.post('deleteMany', async function () {
    const docs = this.get('docsToDelete') || [];
    for (const doc of docs) {
        decUserPostCount(doc);
        deleteMediaUrls(doc);
    }
});
const Post = mongoose.model('Post', postSchema);
export default Post;
