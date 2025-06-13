const catchSocket = (handler) => async (io, socket, ...args) => {
    try {
        await handler(io, socket, ...args);
    }
    catch (err) {
        console.error('Error in socket:', err);
        socket.emit('socketError', {
            message: err instanceof Error
                ? err.message
                : 'An internal server error occurred',
            statusCode: 500,
        });
    }
};
export default catchSocket;
