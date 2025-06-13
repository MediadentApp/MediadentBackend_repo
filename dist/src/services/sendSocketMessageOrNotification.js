import { sendPushNotification } from '../controllers/socketMessageController.js';
import { findSocketByUserId } from '../helper/socketMap.js';
import Notification from '../models/userNotificationModel.js';
export const sendUserNotification = async ({ io, recipientId, sender, type, content, meta = {}, }) => {
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
    }
    else {
        await sendPushNotification(recipientId.toString(), notification);
    }
};
