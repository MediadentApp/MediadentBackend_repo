const { handleSendMessage, handleDisconnect } = require("@src/controllers/socketMessageController");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");

// *Add catchAsync to all
module.exports = (io) => {
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
    console.log('A user connected:', socket.user.username, '(', socket.id, ')');

    socket.on('joinChat', (chatId) => {
      if (!chatId) {
        socket.emit('error', { message: 'Chat ID is required', statusCode: 400 });
        return;
      }

      socket.join(chatId);
      console.log(`User ${socket.user.username} (${socket.id}) joined chat ${chatId}`);
    });

    socket.on('sendMessage', (messageData) => {
      handleSendMessage(io, socket, messageData);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });
};
