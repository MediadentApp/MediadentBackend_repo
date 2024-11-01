const userSockets = require("@src/helper/socketMap");
const { handleSendMessage, handleDisconnect, readNotification, deleteNotification } = require("@src/controllers/socketMessageController");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");

module.exports = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new AppError('Token not provided', 401);
      const user = await User.protectApi(token, '_id firstName lastName email username');
      socket.user = user;
      next();
    } catch (err) {
      console.log('Authentication error===>');
      err.data = { content: "Please retry later" };
      next(err);
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.user.username, '(', socket.id, ')');
    userSockets.set(socket.user._id.toString(), {
      socketId: socket.id,
      rooms: new Set([...socket.rooms]), // Store rooms as a Set for efficient lookup
    });

    socket.on('joinChat', (chatId) => {
      console.log('inside Join Chat: ', chatId);
      if (!chatId) {
        socket.emit('socketError', { message: 'Chat ID is required', statusCode: 400 });
        return;
      }

      socket.join(chatId);
      console.log(`User ${socket.user.username} (${socket.id}) joined chat ${chatId}`);
    });

    socket.on('sendMessage', (messageData) => {
      handleSendMessage(io, socket, messageData);
    });

    socket.on('readNotification', (notificationId) => {
      readNotification(notificationId);
    });

    socket.on('deleteNotification', (notificationId) => {
      deleteNotification(notificationId);
    });

    socket.on('disconnect', () => {
      handleDisconnect(io, socket);
    });
  });
};
