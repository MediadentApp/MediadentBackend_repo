import { IUser } from '#src/types/model.ts';
import { Socket } from 'socket.io';

declare module 'socket.io' {
    interface Socket {
        user: IUser;
    }
}