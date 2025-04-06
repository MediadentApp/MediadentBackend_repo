import { Server, Socket } from 'socket.io';

import {
  handleSendMessage,
  handleDisconnect,
  readNotification,
  deleteNotification,
} from '@src/controllers/socketMessageController';
import userSockets from '@src/helper/socketMap';
import User from '@src/models/userModel';
import AppError from '@src/utils/appError';

// Extend the socket type to include the user object
interface CustomSocket extends Socket {
  user?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    username: string;
  };
  currentChatRoom?: string | null;
}

export default (io: Server) => {
  io.use(async (socket: CustomSocket, next) => {
    try {
      const { token } = socket.handshake.auth;
      if (!token) throw new AppError('Token not provided', 401);

      const user = await User.protectApi(
        token,
        '_id firstName lastName fullName email username',
      );
      socket.user = user;
      next();
    } catch (err: any) {
      console.log('Authentication error===>');
      err.data = { content: 'Please retry later' };
      next(err);
    }
  });

  io.on('connection', (socket: CustomSocket) => {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const { _id: userId, username } = socket.user;
    console.log('A user connected:', username, '(', socket.id, ')');

    userSockets.set(userId.toString(), {
      socketId: socket.id,
      rooms: new Set([...socket.rooms]),
    });

    socket.on('joinChat', (chatId: string) => {
      if (!chatId)
        return socket.emit('socketError', {
          message: 'Chat ID is required',
          statusCode: 400,
        });

      // Join the new chat room
      socket.join(chatId);
      socket.currentChatRoom = chatId;
      console.log(`User ${username} (${socket.id}) joined chat ${chatId}`);

      // Update userSockets with the updated rooms set
      userSockets.get(userId.toString())?.rooms.add(chatId);
    });

    socket.on('leaveChat', (chatId: string) => {
      if (!chatId)
        return socket.emit('socketError', {
          message: 'Chat ID is required',
          statusCode: 400,
        });

      socket.leave(chatId);
      socket.currentChatRoom = null;
      console.log(`User ${username} (${socket.id}) left chat: ${chatId}`);

      userSockets.get(userId.toString())?.rooms.delete(chatId);
    });

    socket.on('sendMessage', (messageData: any) => {
      handleSendMessage(io, socket, messageData);
    });

    socket.on('readNotification', (notification: any) => {
      readNotification(io, socket, notification, userId);
    });

    socket.on('deleteNotification', (notificationId: string) => {
      deleteNotification(io, socket, notificationId);
    });

    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
};
