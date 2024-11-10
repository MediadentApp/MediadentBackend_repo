const userSockets = require("@src/helper/socketMap");
const { handleSendMessage, handleDisconnect, readNotification, deleteNotification } = require("@src/controllers/socketMessageController");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new AppError('Token not provided', 401);
      const user = await User.protectApi(token, '_id firstName lastName fullName email username');
      socket.user = user;
      next();
    } catch (err) {
      console.log('Authentication error===>');
      err.data = { content: "Please retry later" };
      next(err);
    }
  });

  io.on('connection', (socket) => {
    const { _id: userId, username } = socket.user;
    console.log('A user connected:', username, '(', socket.id, ')');

    userSockets.set(userId.toString(), {
      socketId: socket.id,
      rooms: new Set([...socket.rooms]),
    });

    socket.on('joinChat', (chatId) => {
      if (!chatId) return socket.emit('socketError', { message: 'Chat ID is required', statusCode: 400 });

      // Join the new chat room
      socket.join(chatId);
      socket.currentChatRoom = chatId;
      console.log(`User ${username} (${socket.id}) joined chat ${chatId}`);

      // Update userSockets with the updated rooms set
      userSockets.get(userId.toString()).rooms.add(chatId);
    });

    socket.on('leaveChat', (chatId) => {
      if (!chatId) return socket.emit('socketError', { message: 'Chat ID is required', statusCode: 400 });
      socket.leave(chatId);
      socket.currentChatRoom = null;
      console.log(`User ${username} (${socket.id}) left chat: ${chatId}`);

      userSockets.get(userId.toString()).rooms.delete(chatId);
    });

    socket.on('sendMessage', (messageData) => {
      handleSendMessage(io, socket, messageData);
    });

    socket.on('readNotification', (notification) => {
      readNotification(io, socket, notification, userId);
    });

    socket.on('deleteNotification', (notificationId) => {
      deleteNotification(io, socket, notificationId);
    });

    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
};
