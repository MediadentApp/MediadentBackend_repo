import { Document, ObjectId } from 'mongoose';
import { PostAuthorType, ReportStatus, VoteEnum } from './enum.js';

export interface IPost extends Document {
  slug: string; // URL-safe, unique (e.g., “computer-science”)

  title: string;
  content: string;
  mediaUrls?: string[];
  tags: string[];

  communityId: ObjectId | null; // ID can be of Community
  authorId: ObjectId;

  views: number;
  upvotesCount: number;
  downvotesCount: number;
  commentsCount: number;
  netVotes?: number; // virtual mongoose field

  popularityScore?: number;
  isDeleted?: boolean;
  isFlagged?: boolean;
  isApproved?: boolean;
  flagReason?: string;
}

export interface IPostVote extends Document {
  postId: ObjectId;
  userId: ObjectId;
  voteType: VoteEnum;
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

  upvotesCount: number;
  downvotesCount: number;
  children: IPostComment[];
  childrenCount: number;
  isDeleted: boolean;

  createdAt: Date;
  updatedAt: Date;
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
