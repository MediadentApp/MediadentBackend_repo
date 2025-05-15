import { BooleanQuery, SortMethod } from '#src/types/enum.js';
import { SortDirection } from 'mongodb';

export type ICommentQuery = {
  postId: string;
  parentId: string;
  commentId: string;
  children: string;
  childLimit: string;
  childSkip: string;
  limit: number;
  skip: string;
  page: number;
  sortMethod: SortMethod;
  sortOrder: SortDirection;
};
