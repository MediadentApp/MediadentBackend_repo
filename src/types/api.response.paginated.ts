import { IBaseApiResponse } from '#src/types/api.response.js';
import { Response } from 'express';
import { PipelineStage } from 'mongoose';
import { ParsedQs } from 'qs';

export type AppPaginatedResponse<DataType = any> = Response<IPaginatedResponse<DataType>>;

export interface IPaginatedResponse<T = any> extends IBaseApiResponse {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasMore?: boolean;
}

export type DefaultProjectionType = Record<string, '0' | '1'>;
export type SortOrder = 'asc' | 'desc';

export interface IPaginationOptions<T = any> {
  page?: string;
  pageSize?: string;
  selectFields?: string;
  sortOrder?: SortOrder;
  sortField?: string;
  projection?: string;
  populateFields?: { path: string; select: string; from?: string }[];
  defaultProjection?: DefaultProjectionType;
  searchValue?: string;
  searchFields?: string[] | string;
  excludeIds?: string | string[]; // optional: to exclude some _id values
  ids?: string | string[];
  filter?: Record<string, any>;
  lastPipline?: PipelineStage[];
}
