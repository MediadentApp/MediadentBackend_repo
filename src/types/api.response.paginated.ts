import { IBaseApiResponse } from '#src/types/api.response.js';
import { SortOrder } from 'mongoose';

export interface IPaginationOptions {
  page?: number;
  pageSize?: number;
  filter?: object;
  sort?: { [key: string]: SortOrder };
  projection?: object;
}

export interface IPaginatedResponse<T> extends IBaseApiResponse {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}
