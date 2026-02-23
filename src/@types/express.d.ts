// Augmenting Express `Request` type
import { Server as SocketIOServer } from 'socket.io';
import { IUser } from '#src/types/model';
import { PrepPalSessionDocument } from '#src/models/prepPal/session.model.ts';

declare module 'express-serve-static-core' {
  interface Request {
    user?: IUser;
    usage?: {
      prepPal: PrepPalSessionDocument;
    };
    requestTime?: string;
    csrfToken: () => string;
  }

  interface Application {
    get(name: 'io'): SocketIOServer;
    set(name: 'io', value: SocketIOServer): this;
  }
}
