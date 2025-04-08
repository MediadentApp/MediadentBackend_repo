import { Server, Socket } from 'socket.io';

import AppError from '#src/utils/appError.js';
import User from '#src/models/userModel.js';
import userSockets from '#src/helper/socketMap.js';
import {
  deleteNotification,
  handleDisconnect,
  handleSendMessage,
  readNotification,
} from '#src/controllers/socketMessageController.js';
import { IAuthenticatedSocket } from '#src/types/request.socket.js';

export default (io: Server) => {
  io.use(async (socket: Socket, next) => {
    try {
      const authSocket = socket as IAuthenticatedSocket;

      const { token } = authSocket.handshake.auth;
      if (!token) throw new AppError('Token not provided', 401);

      const user = await User.protectApi(token, '_id firstName lastName fullName email username');
      authSocket.user = user;
      next();
    } catch (err: any) {
      console.log('Authentication error===>');
      err.data = { content: 'Please retry later' };
      next(err);
    }
  });

  io.on('connection', (socket: Socket) => {
    const authSocket = socket as IAuthenticatedSocket;
    if (!authSocket.user) {
      authSocket.disconnect();
      return;
    }

    const { _id: userId, username } = authSocket.user;
    console.log('A user connected:', username, '(', authSocket.id, ')');

    userSockets.set(userId.toString(), {
      socketId: authSocket.id,
      rooms: new Set([...authSocket.rooms]),
    });

    authSocket.on('joinChat', (chatId: string) => {
      if (!chatId) {
        return authSocket.emit('socketError', {
          message: 'Chat ID is required',
          statusCode: 400,
        });
      }

      // Join the new chat room
      authSocket.join(chatId);
      authSocket.currentChatRoom = chatId;
      console.log(`User ${username} (${authSocket.id}) joined chat ${chatId}`);

      // Update userSockets with the updated rooms set
      userSockets.get(userId.toString())?.rooms.add(chatId);
    });

    authSocket.on('leaveChat', (chatId: string) => {
      if (!chatId) {
        return authSocket.emit('socketError', {
          message: 'Chat ID is required',
          statusCode: 400,
        });
      }

      authSocket.leave(chatId);
      authSocket.currentChatRoom = null;
      console.log(`User ${username} (${authSocket.id}) left chat: ${chatId}`);

      userSockets.get(userId.toString())?.rooms.delete(chatId);
    });

    authSocket.on('sendMessage', (messageData: any) => {
      handleSendMessage(io, authSocket, messageData);
    });

    authSocket.on('readNotification', (notification: any) => {
      readNotification(io, authSocket, notification, String(userId));
    });

    authSocket.on('deleteNotification', (notificationId: string) => {
      deleteNotification(io, authSocket, notificationId);
    });

    authSocket.on('disconnect', () => {
      handleDisconnect(io, authSocket);
    });
  });
};
