import { IResponseMessage } from '#src/types/api.response.messages.js';
import { IUser } from '#src/types/model.js';
import { Response } from 'express';

export type AppResponse<ResponseType = IApiResponse, DataType = any> = Response<
  ResponseType & { data: IResponseData<DataType> }
>;
// export type AppResponse = Response<IApiResponse<IResponseData<unknown>>>;

export interface IApiResponse<T = any> extends IBaseApiResponse, IResponseExtra<T> {}

export interface IBaseApiResponse {
  status: 'success' | 'error';
  message: IResponseMessage;
}

export interface IResponseExtra<T = any> {
  data?: IResponseData<T>;
  authenticated?: boolean;
  redirectUrl?: string;
  token?: string;
}

export interface IResponseData<T> {
  user?: IUser;
  email?: string;
  [key: string]: T | any;
}
