const { handleSendMessage, handleDisconnect } = require("@src/controllers/socketController");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");

module.exports = (io) => {

  // Socket.IO authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) throw new AppError('Token not provided', 401);

      const user = await User.protect(token);
      socket.user = user;
      next();
    } catch (err) {
      console.log('Authentication error===>');
      err.data = { content: "Please retry later" };
      next(err);  // Pass the error to the centralized error handler
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.user.username, socket.id);

    // Join a specific chat room
    socket.on('joinChat', (chatId) => {
      if (!chatId) {
        socket.emit('error', { message: 'Chat ID is required', statusCode: 400 });
        return;
      }

      socket.join(chatId);
      console.log(`User ${socket.user.username} (${socket.id}) joined chat ${chatId}`);
    });

    // Handle sending a message
    socket.on('sendMessage', (messageData) => {
      try {
        handleSendMessage(io, socket, messageData);
      } catch (err) {
        socket.emit('error', { message: err.message || 'Failed to send message', statusCode: 500 });
      }
    });

    // Handle user disconnect
    socket.on('disconnect', () => {
      handleDisconnect(socket);
      console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
    });
  });
};
