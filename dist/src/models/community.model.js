import { deleteImagesFromS3 } from '../libs/s3.js';
import { CommunityInviteStatus, CommunityRole, CommunityType, ReportStatus } from '../types/enum.js';
import mongoose, { Schema } from 'mongoose';
const communitySchema = new Schema({
    name: { type: String, required: true, trim: true, unique: true, immutable: true }, // declaring unique automaticallly indexes it
    slug: { type: String, required: true, trim: true, index: true, immutable: true },
    description: { type: String, trim: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Community' },
    children: [{ type: Schema.Types.ObjectId, ref: 'Community' }],
    path: [String],
    avatarUrl: String,
    bannerUrl: String,
    verified: Boolean,
    type: { type: String, enum: CommunityType, default: CommunityType.Public },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, immutable: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    membersCount: { type: Number, default: 0, min: 0 },
    followersCount: { type: Number, default: 0, min: 0 },
    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bannedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mutedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    invitedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isDeleted: { type: Boolean, default: false },
}, { timestamps: true });
function deleteImages(doc) {
    const deleteImages = [];
    if (doc.avatarUrl) {
        deleteImages.push(doc.avatarUrl);
    }
    if (doc.bannerUrl) {
        deleteImages.push(doc.bannerUrl);
    }
    if (deleteImages.length) {
        // can be debounced
        void deleteImagesFromS3(deleteImages);
    }
}
communitySchema.post('findOneAndDelete', async function (doc) {
    deleteImages(doc);
});
communitySchema.post('deleteOne', async function (doc) {
    deleteImages(doc);
});
const Community = mongoose.model('Community', communitySchema);
// CommunityInvite Model
const communityInviteSchema = new Schema({
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    role: { type: String, enum: CommunityRole, required: true },
    status: { type: String, enum: CommunityInviteStatus, required: true },
}, { timestamps: true });
const CommunityInvite = mongoose.model('CommunityInvite', communityInviteSchema);
const reportCommunitySchema = new Schema({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ReportStatus, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
export default Community;
export { CommunityInvite };
