import { Document, ObjectId } from 'mongoose';
import { CommunityInviteStatus, CommunityRole, CommunityType, ReportStatus } from './enum.js';

export interface ICommunity extends Document {
  name: string;
  description: string;
  slug: string;
  parentId?: ObjectId | null;
  children: ObjectId[];
  path?: string[];

  avatarUrl: string;
  bannerUrl: string;
  verified: boolean;
  type: CommunityType;

  owner: ObjectId;
  members: ObjectId[];
  membersCount: number;
  postCount: number;
  isDeleted: boolean;

  moderators: ObjectId[];
  bannedUsers: ObjectId[];
  blockedUsers: ObjectId[];
  mutedUsers: ObjectId[];
  invitedUsers: ObjectId[];
  // roles: {
  //     userId: ObjectId;
  //     role: CommunityRole;
  // }[]
}

export interface ICommunityInvite {
  communityId: ObjectId;
  invitedBy: ObjectId;
  email: string;
  expiresAt: Date;
  role: CommunityRole;
  status: CommunityInviteStatus;
}

export interface IReportCommunity {
  postId: ObjectId;
  reportedBy: ObjectId;
  reason: string;
  status: ReportStatus;
  reviewedBy?: ObjectId;
}
