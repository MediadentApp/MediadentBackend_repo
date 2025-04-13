import responseMessages from '#src/config/constants/responseMessages.js';
import { IUser } from '#src/types/model.js';

// This type extracts all the values (deeply) from the object
type Flatten<T> = T extends object ? T[keyof T] : never;
export type IResponseMessage = Flatten<Flatten<typeof responseMessages>>;

export interface IApiResponse<T = any> extends IResponseExtra {
  status: 'success' | 'error';
  message: IResponseMessage;
  data?: IResponseData<T>;
  [key: string]: any;
}

export interface IResponseExtra {
  authenticated?: boolean;
  redirectUrl?: string;
  [key: string]: any;
}

export interface IResponseData<T> {
  user?: IUser;
  email?: string;
  [key: string]: T | any;
}
