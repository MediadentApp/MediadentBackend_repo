// Augmenting Express `Request` type
import { IUser } from '#src/types/model.ts';
import { Request } from 'express';

declare module 'express-serve-static-core' {
  interface Request {
    user: IUser;
    requestTime?: string;
  }
}
