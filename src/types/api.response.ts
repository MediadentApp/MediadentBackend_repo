import responseMessages from '#src/config/constants/responseMessages.js';
import { IUser } from '#src/types/model.js';
import { Request, Response } from 'express';

// This type extracts all the values (deeply) from the object
type Flatten<T> = T extends object ? T[keyof T] : never;
export type IResponseMessage = Flatten<Flatten<typeof responseMessages>>;

export interface IApiResponse<T = any> extends IBaseApiResponse, IResponseExtra<T> {}

export interface IBaseApiResponse {
  status: 'success' | 'error';
  message: IResponseMessage;
}

export interface IResponseExtra<T = any> {
  data?: IResponseData<T>;
  authenticated?: boolean;
  redirectUrl?: string;
  [key: string]: any;
}

export interface IResponseData<T> {
  user?: IUser;
  email?: string;
  [key: string]: T | any;
}
