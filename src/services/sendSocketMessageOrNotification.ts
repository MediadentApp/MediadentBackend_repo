import { sendPushNotification } from '#src/controllers/socketMessageController.js';
import userSockets, { findSocketByUserId } from '#src/helper/socketMap.js';
import Notification from '#src/models/userNotificationModel.js';
import { Server } from 'socket.io';

interface SendUserNotificationParams {
  io: Server;
  recipientId: string;
  sender: {
    _id: string;
    fullName?: string;
    username: string;
  };
  type: 'newMessage' | 'follow' | 'comment' | 'like' | string;
  content: string;
  meta?: Record<string, any>; // Optional additional info like relatedPostId or chatId
}

export const sendUserNotification = async ({
  io,
  recipientId,
  sender,
  type,
  content,
  meta = {},
}: SendUserNotificationParams): Promise<void> => {
  // Create DB notification
  const notification = await Notification.create({
    userId: recipientId,
    senderId: sender._id,
    senderName: sender.fullName || 'Unknown',
    senderUsername: sender.username,
    type,
    content,
    isRead: false,
    ...meta,
  });

  const recipientData = findSocketByUserId(recipientId.toString());
  if (recipientData) {
    io.to(recipientData.socketId).emit('newNotification', notification);
  } else {
    await sendPushNotification(recipientId.toString(), notification);
  }
};
