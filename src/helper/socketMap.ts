// To map user by socket.io's socket
const userSockets: Map<string, any> = new Map<string, any>();

/**
 * Finds a socket connection by user ID.
 * @param userId - The user ID.
 * @returns The socket instance or undefined.
 */
export const findSocketByUserId = (userId: string): any => userSockets.get(userId);

export default userSockets;
