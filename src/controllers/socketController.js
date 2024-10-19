const AppError = require("@src/utils/appError");

exports.handleSendMessage = (io, socket, messageData) => {
  const { chatId, content } = messageData;

  if (!chatId || !content) {
    throw new AppError('Chat ID and message content are required', 400);
  }

  // Emit the message to the relevant chat room
  io.to(chatId).emit('receiveMessage', {
    senderID: socket.user._id,
    sendUsername: socket.user.username,
    content,
    timestamp: new Date(),
  });
};

exports.handleDisconnect = (socket) => {
  // Add custom logic for handling user disconnection
  console.log(`User ${socket.user.username} disconnected`);
};
