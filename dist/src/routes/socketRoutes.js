import userSockets from '../helper/socketMap.js';
import { handleDisconnect, handleSendMessage, readNotification, } from '../controllers/socketMessageController.js';
import socketAuthCheck from '../services/socketAuthentication.service.js';
export default (io) => {
    io.use(async (socket, next) => {
        socketAuthCheck(socket, next);
    });
    io.on('connection', (socket) => {
        const authSocket = socket;
        if (!authSocket.user) {
            authSocket.disconnect();
            return;
        }
        const { _id: userId, username } = authSocket.user;
        console.log('A user connected:', username, '(', authSocket.id, ')');
        userSockets.set(userId.toString(), {
            socketId: authSocket.id,
            rooms: new Set([...authSocket.rooms]),
        });
        authSocket.on('joinChat', (chatId) => {
            if (!chatId) {
                return authSocket.emit('socketError', {
                    message: 'Chat ID is required',
                    statusCode: 400,
                });
            }
            // Join the new chat room
            authSocket.join(chatId);
            authSocket.currentChatRoom = chatId;
            console.log(`User ${username} (${authSocket.id}) joined chat ${chatId}`);
            // Update userSockets with the updated rooms set
            userSockets.get(userId.toString())?.rooms.add(chatId);
        });
        authSocket.on('check-room', (roomId, callback) => {
            const rooms = authSocket.rooms;
            callback(rooms.has(roomId)); // socket.rooms is a Set
        });
        authSocket.on('leaveChat', (chatId) => {
            if (!chatId) {
                return authSocket.emit('socketError', {
                    message: 'Chat ID is required',
                    statusCode: 400,
                });
            }
            authSocket.leave(chatId);
            authSocket.currentChatRoom = null;
            console.log(`User ${username} (${authSocket.id}) left chat: ${chatId}`);
            userSockets.get(userId.toString())?.rooms.delete(chatId);
        });
        authSocket.on('sendMessage', (messageData) => {
            handleSendMessage(io, authSocket, messageData);
        });
        authSocket.on('readNotification', (notificationIds) => {
            readNotification(io, authSocket, { notificationIds, method: 'read' });
        });
        authSocket.on('deleteNotification', (notificationIds) => {
            readNotification(io, authSocket, { notificationIds, method: 'delete' });
            // deleteNotification(io, authSocket, notificationId);
        });
        authSocket.on('disconnect', () => {
            handleDisconnect(io, authSocket);
        });
    });
};
