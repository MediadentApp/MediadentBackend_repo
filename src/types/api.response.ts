import { ErrorCodeType } from '#src/types/api.response.error.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { IUser } from '#src/types/model.js';
import { Response } from 'express';

export type AppResponse<ResponseType = IApiResponse, DataType = any> = Response<
  ResponseType & { data?: IResponseData<DataType> }
>;
// export type AppResponse = Response<IApiResponse<IResponseData<unknown>>>;

export interface IApiResponse<T = any> extends IBaseApiResponse, Omit<IResponseExtra<T>, 'message'> {}

export interface IBaseApiResponse {
  status: 'success' | 'error';
  message: IResponseMessage;
}

export interface IResponseExtra<T = any> {
  authenticated?: boolean;
  redirectUrl?: string;
  errorCode?: ErrorCodeType;

  data?: IResponseData<T>; // For specific use cases

  // For exceptions, like createSendToken
  message?: IResponseMessage;
}

export interface IResponseData<T = any> {
  user?: IUser;
  email?: string;
  [key: string]: T | any;
}

export interface IResponseExtraCommentPagination extends IResponseExtra {
  hasMore: boolean;
  totalRootComments: number;
  rootId: string;
  depth: number;
  limit: number;
  page: number;
  skip: number;
  childLimit: number;
  childSkip: number;
}
