module.exports = catchSocket = (handler) => {
  return async (io, socket, ...args) => {
    try {
      await handler(io, socket, ...args);
    } catch (err) {
      socket.emit('error', {
        message: err.message || 'An internal server error occurred',
        statusCode: 500
      });
    }
  };
};
