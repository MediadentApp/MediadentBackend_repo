module.exports = catchSocket = (handler) => {
  return async (io, socket, ...args) => {
    try {
      await handler(io, socket, ...args);
    } catch (err) {
      console.log('Error in socket: ', err);
      socket.emit('socketError', {
        message: err.message || 'An internal server error occurred',
        statusCode: 500
      });
    }
  };
};
