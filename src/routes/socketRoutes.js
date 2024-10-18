const { handleSendMessage, handleDisconnect } = require("@src/controllers/socketController");

module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('sendMessage', (messageData) => {
      handleSendMessage(io, socket, messageData);
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket);
    });
  });
};
