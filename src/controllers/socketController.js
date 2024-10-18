// const Message = require('@src/models/userMessages');

exports.handleSendMessage = async (io, socket, messageData) => {
  console.log('messageData', messageData);
  // const newMessage = new Message(messageData);
  // await newMessage.save();

  io.emit('receiveMessage', { text: messageData, sender: 'User123' }); // Send to all connected clients
};

exports.handleDisconnect = (socket) => {
  console.log('User disconnected:', socket.id);
};
