// To map user by socket.io's socket
const userSockets = new Map();
/**
 * Finds a socket connection by user ID.
 * @param userId - The user ID.
 * @returns The socket instance or undefined.
 */
export const findSocketByUserId = (userId) => userSockets.get(userId);
export default userSockets;
