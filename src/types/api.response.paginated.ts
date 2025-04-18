import { IBaseApiResponse } from '#src/types/api.response.js';
import { Response } from 'express';
import { ParsedQs } from 'qs';

export type AppPaginatedResponse<DataType = any> = Response<IPaginatedResponse<DataType>>;

export interface IPaginatedResponse<T = any> extends IBaseApiResponse {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export type DefaultProjectionType = Record<string, '0' | '1'>;
export type SortOrder = 'asc' | 'desc';

export interface IPaginationOptions extends ParsedQs {
  page?: string;
  pageSize?: string;
  filter?: Record<string, any>;
  sortOrder?: SortOrder;
  sortField?: string;
  projection?: string;
  defaultProjection?: DefaultProjectionType;
  searchValue?: string;
  searchFields?: string[] | string;
  excludeIds?: string | string[]; // optional: to exclude some _id values
  ids?: string | string[];
}
