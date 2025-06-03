import { Document, ObjectId, Types } from 'mongoose';
import { ReportStatus, VoteEnum } from './enum.js';
import { ICommunity } from '#src/types/model.community.js';
import { IUser } from '#src/types/model.js';

export interface IPost extends Document<ObjectId> {
  slug: string; // URL-safe, unique (e.g., “computer-science”)

  title: string;
  content: string;
  mediaUrls?: string[];
  tags: string[];

  communityId: ObjectId | null; // ID can be of Community
  community?: ICommunity;
  authorId: ObjectId;
  author?: IUser;

  views: number;
  upvotesCount: number;
  downvotesCount: number;
  commentsCount: number;
  savesCount: number;

  netVotes?: number; // virtual mongoose field

  isSaved?: boolean; // would not be in schema
  isViewed?: boolean;

  popularityScore?: { type: number; default: 6 };
  isDeleted?: boolean;
  isFlagged?: boolean;
  isApproved?: boolean;
  flagReason?: string;

  createdAt: Date;
  updatedAt: Date;
  popularityUpdatedAt?: Date;
}

export interface IPostVote extends Document {
  postId: ObjectId;
  userId: ObjectId;
  voteType: VoteEnum;
}

export interface IPostSave extends Document {
  userId: ObjectId; // reference to User
  postId: ObjectId; // reference to Post
}

export interface IPostTag extends Document {
  name: string;
  description?: string;
  usageCount: number;
}

export interface IPostComment extends Document<ObjectId> {
  postId: ObjectId;
  parentId: ObjectId;
  userId: ObjectId;
  content: string;

  commentsCount: number;
  upvotesCount: number;
  downvotesCount: number;
  children?: IPostComment[];
  childrenCount: number;
  isDeleted: boolean;
  voteType: VoteEnum | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface IPostView extends Document<ObjectId> {
  userId: ObjectId;
  postId: ObjectId;
  viewedAt: Date;
}

export interface ICommentVote extends Document {
  commentId: ObjectId;
  userId: ObjectId;
  voteType: VoteEnum;
}

export interface IReportComment {
  postId: ObjectId;
  reportedBy: ObjectId;
  reason: string;
  status: ReportStatus;
  reviewedBy?: ObjectId;
}
