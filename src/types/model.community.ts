import { Document, ObjectId, Types } from 'mongoose';
import { CommunityInviteStatus, CommunityRole, CommunityType, ReportStatus } from './enum.js';

export interface ICommunity extends Document<ObjectId> {
  name: string;
  description: string;
  slug: string;
  parentId?: Types.ObjectId | null;
  children: Types.ObjectId[];
  path?: string[];

  avatarUrl: string;
  bannerUrl: string;
  verified: boolean;
  type: CommunityType;

  owner: Types.ObjectId;
  members: Types.ObjectId[];
  membersCount: number;
  postCount: number;
  isDeleted: boolean;

  followersCount: number;
  isFollowing?: boolean;

  moderators: Types.ObjectId[];
  bannedUsers: Types.ObjectId[];
  blockedUsers: Types.ObjectId[];
  mutedUsers: Types.ObjectId[];
  invitedUsers: Types.ObjectId[];
  // roles: {
  //     userId: Types.ObjectId;
  //     role: CommunityRole;
  // }[]
}

export interface IFollowsCommunity {
  userId: Types.ObjectId;
  communityId: Types.ObjectId;
}

export interface ICommunityInvite {
  communityId: Types.ObjectId;
  invitedBy: Types.ObjectId;
  email: string;
  expiresAt: Date;
  role: CommunityRole;
  status: CommunityInviteStatus;
}

export interface IReportCommunity {
  postId: Types.ObjectId;
  reportedBy: Types.ObjectId;
  reason: string;
  status: ReportStatus;
  reviewedBy?: Types.ObjectId;
}
