import { IAuthenticatedSocket } from '#src/types/request.socket.js';
import { Server, Socket } from 'socket.io';

const catchSocket =
  <T extends unknown[]>(
    handler: (
      io: Server,
      socket: IAuthenticatedSocket,
      ...args: T
    ) => Promise<void>
  ) =>
  async (io: Server, socket: IAuthenticatedSocket, ...args: T) => {
    try {
      await handler(io, socket, ...args);
    } catch (err) {
      console.error('Error in socket:', err);
      socket.emit('socketError', {
        message:
          err instanceof Error
            ? err.message
            : 'An internal server error occurred',
        statusCode: 500,
      });
    }
  };

export default catchSocket;
