import { CommunityInviteStatus, CommunityRole, CommunityType, PostAuthorType, ReportStatus } from "#src/types/enum.js";
import { ICommunity, ICommunityInvite, IReportCommunity } from "#src/types/model.community.js";
import mongoose, { Schema } from "mongoose";

const communitySchema: Schema<ICommunity> = new Schema<ICommunity>({
    name: { type: String, required: true, trim: true, text: true },
    slug: { type: String, required: true, trim: true, unique: true },
    description: String,
    parentId: { type: Schema.Types.ObjectId, ref: 'Community' },
    children: [{ type: Schema.Types.ObjectId, ref: 'Community' }],
    path: [String],
    avatarUrl: String,
    bannerUrl: String,
    verified: Boolean,
    type: { type: String, enum: CommunityType, required: true, default: CommunityType.Public },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    membersCount: { type: Number, default: 0 },
    postCount: { type: Number, default: 0 },

    moderators: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    bannedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    blockedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    mutedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    invitedUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],

    isDeleted: Boolean,
}, { timestamps: true })

const Community = mongoose.model<ICommunity>('Community', communitySchema);

const communityInviteSchema: Schema<ICommunityInvite> = new Schema<ICommunityInvite>({
    communityId: { type: Schema.Types.ObjectId, ref: 'Community', required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    email: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    role: { type: String, enum: CommunityRole, required: true },
    status: { type: String, enum: CommunityInviteStatus, required: true },
}, { timestamps: true })

const CommunityInvite = mongoose.model<ICommunityInvite>('CommunityInvite', communityInviteSchema);

const reportCommunitySchema: Schema<IReportCommunity> = new Schema<IReportCommunity>({
    postId: { type: Schema.Types.ObjectId, ref: 'Post', required: true },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ReportStatus, required: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true })

export default Community;
export { CommunityInvite }