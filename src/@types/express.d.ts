// Augmenting Express `Request` type
import { Server as SocketIOServer } from 'socket.io';
import { IUser } from '#src/types/model';

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
