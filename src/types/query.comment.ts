import { BooleanQuery, SortMethod } from '#src/types/enum.js';
import { SortDirection } from 'mongodb';

export type ICommentQuery = {
  postId: string;
  parentId: string;
  commentId: string;
  children: string;
  sortMethod: SortMethod;
  sortOrder: SortDirection;
  skip: string;
  page: number;
  limit: number;
};
