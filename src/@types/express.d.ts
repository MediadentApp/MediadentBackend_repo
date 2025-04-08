// Augmenting Express `Request` type
import { IUser } from '../models/userModel.ts';
import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    requestTime?: string;
  }
}
