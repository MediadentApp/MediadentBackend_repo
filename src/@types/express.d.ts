// Augmenting Express `Request` type
import { IUser } from '#src/types/model';
import { Server as SocketIOServer } from 'socket.io';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    requestTime?: string;
    csrfToken: () => string;
  }

  interface Application {
    get(name: 'io'): SocketIOServer;
    set(name: 'io', value: SocketIOServer): this;
  }
}

export {};
