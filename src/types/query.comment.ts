import { BooleanQuery, SortMethod } from '@studenhub/studenhub-contracts';
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
