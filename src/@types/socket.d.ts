import { IUser } from '#src/types/model.ts';

declare module 'socket.io' {
  interface Socket {
    user: IUser;
  }
}
