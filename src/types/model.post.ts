import { Document, ObjectId } from 'mongoose';
import { PostAuthorType, ReportStatus } from './enum.js';

export interface IPost extends Document {
  slug: string; // URL-safe, unique (e.g., “computer-science”)

  title: string;
  content: string;
  mediaUrls?: string[];
  tags: string[];

  communityId: ObjectId | null; // ID can be of Community
  authorId: ObjectId;

  views?: number;
  likes?: ObjectId[];
  likesCount?: number;
  commentsCount?: number;
  popularityScore?: number;
  isDeleted?: boolean;
  isFlagged?: boolean;
  isApproved?: boolean;
  flagReason?: string;
}

export interface IPostTag extends Document {
  name: string;
  description?: string;
  usageCount: number;
}

export interface IPostComment extends Document {
  _id: ObjectId;
  postId: ObjectId;
  parentId: ObjectId;
  userId: ObjectId;
  content: string;

  likes: ObjectId[];
  likesCount: number;
  children: IPostComment[];
  childrenCount: number;
  isDeleted: boolean;
}

export interface IReportComment {
  postId: ObjectId;
  reportedBy: ObjectId;
  reason: string;
  status: ReportStatus;
  reviewedBy?: ObjectId;
}
