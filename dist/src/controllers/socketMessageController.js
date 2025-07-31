import appConfig from '../config/appConfig.js';
import { ErrorCodes } from '../config/constants/errorCodes.js';
import responseMessages from '../config/constants/responseMessages.js';
import userSockets, { findSocketByUserId } from '../helper/socketMap.js';
import { Chat, GroupChat, Message, WebPushSubscription } from '../models/userMessages.js';
import User from '../models/userModel.js';
import Notification from '../models/userNotificationModel.js';
import NotificationService from '../services/notifications.service.js';
import { MessageStatus } from '../types/enum.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import catchSocket from '../utils/catchSocket.js';
import { stringToObjectID } from '../utils/index.js';
import mongoose from 'mongoose';
import webPush from 'web-push';
/**
 * socket: AuthenticatedSocket → Represents a single user's connection. Used for emitting events to that specific socket.
 * io: Server → Represents the whole server. Used for emitting events to rooms, broadcasting messages, and managing multiple connections.
 */
const { NOTIFICATION_TIMEOUT_DELAY, READ_NOTIFICATION_BATCH_THRESHOLD, DELETE_NOTIFICATION_BATCH_THRESHOLD } = appConfig.notification;
// Batched Delete Notifications
let notificationsToDelete = [];
let deleteNotificationTimeoutId;
const VAPID_WEBPUSH_PUBLIC_KEY = process.env.WEBPUSH_PUBLIC_KEY;
const VAPID_WEBPUSH_PRIVATE_KEY = process.env.WEBPUSH_PRIVATE_KEY;
const VAPID_WEBPUSH_EMAIL = process.env.WEBPUSH_EMAIL;
if (!VAPID_WEBPUSH_PUBLIC_KEY || !VAPID_WEBPUSH_PRIVATE_KEY || !VAPID_WEBPUSH_EMAIL) {
    throw new Error('VAPID keys are missing.');
}
// Web Push Configuration
webPush.setVapidDetails(VAPID_WEBPUSH_EMAIL, VAPID_WEBPUSH_PUBLIC_KEY, VAPID_WEBPUSH_PRIVATE_KEY);
/**
 * Gets or creates a chat ID between two users.
 */
export const getChatID = catchAsync(async (req, res, next) => {
    const { _id: userAId, fullName: userAFullName, username: userAUsername } = req.user;
    const { userBId, chatId = null } = req.body;
    const io = req.app.get('io');
    // Early return for invalid userBId or self-chat
    if (!userBId || userAId === userBId) {
        return next(new ApiError(responseMessages.SOCKET.USER_ID_INVALID, 400, ErrorCodes.SOCKET.USER_NOT_FOUND));
    }
    // Attempt to find an existing one-on-one chat
    const chat = chatId
        ? await Chat.findOne({
            _id: chatId,
            participants: { $all: [userAId, userBId], $size: 2 },
            active: true,
        }).lean()
        : await Chat.findOne({
            participants: { $all: [userAId, userBId] },
            'participants.2': { $exists: false },
            active: true,
        }).lean();
    if (chat) {
        await User.updateMany({ _id: { $in: [userAId, userBId] } }, { $addToSet: { 'chats.chatIds': chat._id } });
        return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, { chatId: chat._id, userBId });
    }
    // Fetch userB to ensure it exists
    const userB = await User.findById(userBId).select('_id firstName').lean();
    if (!userB) {
        return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    // Start a transaction to create the new chat and update both users
    const session = await mongoose.startSession();
    session.startTransaction();
    let newChatId;
    try {
        const newChat = await Chat.create([{ participants: [userAId, userB._id], active: true }], { session });
        newChatId = newChat[0]._id;
        await User.updateMany({ _id: { $in: [userAId, userB._id] } }, { $addToSet: { 'chats.chatIds': newChatId } }, { session });
        await session.commitTransaction();
    }
    catch (error) {
        await session.abortTransaction();
        return next(new ApiError(responseMessages.SOCKET.COULD_NOT_CREATE_CHAT, 500));
    }
    finally {
        session.endSession();
    }
    // Create and emit notification
    const notification = {
        userId: userB._id.toString(),
        senderId: userAId,
        senderName: userAFullName,
        senderUsername: userAUsername,
        type: 'newChat',
        relatedChatId: newChatId.toString(),
        content: `${userB.firstName} sent you a message.`,
        isRead: false,
    };
    const savedNotification = await Notification.create(notification);
    const [userBSocket, userASocket] = [findSocketByUserId(userB._id.toString()), findSocketByUserId(userAId)];
    if (userBSocket) {
        io.to(userBSocket.socketId).emit('newNotification', savedNotification);
    }
    else {
        sendPushNotification(String(userB._id), savedNotification);
    }
    if (userASocket) {
        io.to(userASocket.socketId).emit('newNotification', savedNotification);
    }
    else {
        sendPushNotification(userAId, savedNotification);
    }
    const updatedUserA = await User.findFullUser({ _id: userAId });
    return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, {
        chatId: newChatId,
        userBId,
        user: updatedUserA,
    });
});
/**
 * Deletes a chat by chat ID.
 *
 * @param chatId - The ID of the chat to delete.
 */
export const deleteChatId = catchAsync(async (req, res, next) => {
    const { _id: userId } = req.user;
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return next(new ApiError(responseMessages.SOCKET.CHAT_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    const [deletedChat, user] = await Promise.all([
        Chat.findByIdAndDelete(id),
        User.findByIdAndUpdate(userId, { $pull: { 'chats.chatIds': id } }, { new: true })
            .select('+chats.chatIds +chats.groupChatIds')
            .lean(),
    ]);
    const io = req.app.get('io');
    // Emit the deleted chat to the participants that are online
    if (io && deletedChat) {
        console.log('sending delete chat notif');
        const participants = deletedChat.participants;
        const notifData = {
            type: 'deleteChat',
            data: deletedChat._id,
        };
        io.to(participants.map(participant => findSocketByUserId(participant.toString())?.socketId)).emit('command', notifData);
    }
    // Delete notifications related to the chat
    // should be throttled
    Notification.deleteMany({ relatedChatId: id }).exec();
    const data = {
        user: user,
    };
    ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, data);
});
export const chats = catchAsync(async (req, res, next) => {
    const { chatsIdArr } = req.body;
    if (!chatsIdArr)
        return next(new ApiError(responseMessages.SOCKET.CHAT_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    const chatIdArr = await Chat.find({ _id: { $in: chatsIdArr } });
    return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, {
        chatIdArr,
    });
});
export const getSecondParticipants = catchAsync(async (req, res, next) => {
    const { _id: userId } = req.user;
    const { chatIds } = req.body;
    // Validate input
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
        return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    if (!userId) {
        return next(new ApiError(responseMessages.SOCKET.USER_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    const chatIdsObjectID = stringToObjectID(chatIds);
    const userIdObjectID = stringToObjectID(userId);
    // Use aggregation to find chats and exclude the current user from participants
    const chats = await Chat.aggregate([
        {
            $match: {
                _id: { $in: chatIdsObjectID },
                participants: userIdObjectID, // Ensure the user is part of the chat
            },
        },
        {
            $lookup: {
                from: 'users',
                localField: 'participants',
                foreignField: '_id',
                as: 'participantsDetails',
            },
        },
        {
            $unwind: '$participantsDetails',
        },
        {
            $match: {
                'participantsDetails._id': { $ne: userIdObjectID }, // Exclude the current user
            },
        },
        {
            $project: {
                chatId: '$_id',
                secondParticipant: {
                    _id: '$participantsDetails._id',
                    profilePicture: '$participantsDetails.profilePicture',
                    firstName: '$participantsDetails.firstName',
                    lastName: '$participantsDetails.lastName',
                    fullName: '$participantsDetails.fullName',
                    username: '$participantsDetails.username',
                    email: '$participantsDetails.email',
                },
            },
        },
    ]);
    const foundChatIds = new Set(chats.map(chat => chat.chatId.toString()));
    const missingChatIds = chatIdsObjectID.filter(id => !foundChatIds.has(id.toString()));
    if (missingChatIds.length > 0) {
        await User.updateOne({ _id: userIdObjectID }, { $pullAll: { 'chats.chatIds': missingChatIds } });
    }
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, {
        chats,
    });
});
// Create or Retrieve Group Chat
export const groupChatId = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { groupId, groupName, participants, admins = [], groupPicture } = req.body;
    if (!groupName || !participants || participants.length === 0) {
        return next(new ApiError(responseMessages.SOCKET.GROUP_CREATION_DATA_REQUIRED, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    let groupChat;
    if (groupId) {
        // Retrieve existing group chat
        groupChat = await GroupChat.findById(groupId);
        if (!groupChat)
            return next(new ApiError(responseMessages.SOCKET.GROUP_CREATION_DATA_REQUIRED, 400, ErrorCodes.SOCKET.CHAT_NOT_FOUND));
    }
    else {
        // Ensure participants are unique
        const uniqueParticipants = Array.from(new Set([...participants, userId]));
        // Create a new group chat
        groupChat = await GroupChat.create({
            groupName,
            groupPicture,
            participants: uniqueParticipants,
            createdBy: userId,
            admins: admins.length > 0 ? admins : [userId],
        });
        // Update users to include the new groupChatId
        await User.updateMany({ _id: { $in: uniqueParticipants } }, { $addToSet: { 'groups.groupChatIds': groupChat._id } });
    }
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, {
        groupChat,
    });
});
// Leave Group Chat
export const leaveGroupChat = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const { groupId } = req.body;
    if (!groupId) {
        return next(new ApiError(responseMessages.SOCKET.GROUP_ID_REQUIRED, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat) {
        return next(new ApiError(responseMessages.SOCKET.GROUP_NOT_FOUND, 400, ErrorCodes.SOCKET.CHAT_NOT_FOUND));
    }
    if (!groupChat.participants.includes(userId)) {
        return next(new ApiError(responseMessages.SOCKET.NOT_PARTICIPANT, 403, ErrorCodes.SOCKET.NOT_PARTICIPANT));
    }
    // Remove user from group participants
    groupChat.participants = groupChat.participants.filter(participant => participant.toString() !== userId.toString());
    await groupChat.save();
    // Update user document to remove the group chat ID
    await User.findByIdAndUpdate(userId, { $pull: { 'groups.groupChatIds': groupId } }, { new: true });
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, {
        groupChatId: groupId,
    });
});
// !Not Working
// export const leaveGroupChat = catchAsync(
//   async (req: Request, res: AppResponse, next: NextFunction) => {
//     const userId = (req.user as any)._id.toString();
//     const { groupId }: { groupId: string } = req.body;
//     if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
//       return next(new ApiError('Invalid or missing Group ID', 400));
//     }
//     const groupChat = await GroupChat.findById(groupId);
//     if (!groupChat) {
//       return next(new ApiError('Group chat not found', 400));
//     }
//     if (!groupChat.participants || !groupChat.participants.length) {
//       return next(new ApiError('Group chat data is corrupted', 500));
//     }
//     if (!groupChat.participants.map((id) => id.toString()).includes(userId)) {
//       return next(
//         new ApiError('You are not a participant of this group chat', 403)
//       );
//     }
//     // Remove user from participants
//     groupChat.participants = groupChat.participants.filter(
//       (participant) => participant.toString() !== userId
//     );
//     groupChat.markModified('participants'); // Ensure Mongoose updates the array
//     await groupChat.save();
//     // Update user document
//     await User.findByIdAndUpdate(
//       userId,
//       { $pull: { 'groups.groupChatIds': groupId } },
//       { new: true }
//     );
//     res.status(200).json({
//       status: 'success',
//       message: 'You have left the group chat successfully',
//       data: { groupChatId: groupId },
//     });
//   }
// );
export const getMessagesByChatId = catchAsync(async (req, res, next) => {
    const { chatId, oldestMessageDate } = req.body;
    const limit = appConfig.chat.DEFAULT_MESSAGES_PER_PAGE || 20;
    // Validate chatId
    if (!chatId || !mongoose.Types.ObjectId.isValid(chatId)) {
        return next(new ApiError(responseMessages.SOCKET.CHAT_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }
    const query = { chatId };
    if (oldestMessageDate && !isNaN(Date.parse(oldestMessageDate))) {
        query.createdAt = { $lt: new Date(oldestMessageDate) };
    }
    const messages = await Message.find(query).sort('-createdAt').limit(limit).lean();
    if (messages.length === 0) {
        const data = {
            chatId,
            messages: [],
            oldestMessageDate: null,
        };
        return ApiResponse(res, 200, responseMessages.SOCKET.MESSAGES_NOT_FOUND, data);
    }
    const newOldestMessageDate = messages[messages.length - 1].createdAt;
    const data = {
        chatId,
        messages,
        oldestMessageDate: newOldestMessageDate,
    };
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
// Subscribe to push notifications
export const subscribe = catchAsync(async (req, res) => {
    const subscription = req.body;
    await WebPushSubscription.findOneAndUpdate({ userId: req.user._id }, { subscription }, { upsert: true, new: true });
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
// Delete notifications in batch with threshold
export const deleteNotification = catchSocket(async (_io, _socket, notificationId) => {
    if (!notificationsToDelete.includes(notificationId)) {
        notificationsToDelete.push(notificationId);
    }
    if (notificationsToDelete.length >= DELETE_NOTIFICATION_BATCH_THRESHOLD) {
        if (deleteNotificationTimeoutId)
            clearTimeout(deleteNotificationTimeoutId);
        const deletedCount = await Notification.deleteMany({
            _id: { $in: notificationsToDelete },
        });
        notificationsToDelete = []; // Reset batch
        console.log('Deleted notifications:', deletedCount);
    }
    else {
        if (deleteNotificationTimeoutId)
            clearTimeout(deleteNotificationTimeoutId);
        deleteNotificationTimeoutId = setTimeout(async () => {
            if (notificationsToDelete.length > 0) {
                const deletedCount = await Notification.deleteMany({
                    _id: { $in: notificationsToDelete },
                });
                notificationsToDelete = []; // Reset batch
                console.log('Deleted notifications:', deletedCount);
            }
        }, NOTIFICATION_TIMEOUT_DELAY);
    }
});
// Mark notifications as read in batch with threshold
export const readNotification = catchSocket(async (_io, socket, { notificationIds, method }) => {
    if (!notificationIds.length) {
        console.log('Missing notification id');
        return;
    }
    if ((method = 'delete')) {
        NotificationService.add({
            collectionName: 'ReadNotifications',
            type: 'delete',
            id: `${socket.user._id}-${Date.now()}`,
            data: notificationIds,
        });
    }
    else {
        NotificationService.add({
            collectionName: 'ReadNotifications',
            type: 'update',
            id: `${socket.user._id}-${Date.now()}`,
            data: notificationIds,
        });
    }
});
// Handle sending a message
export const handleSendMessage = catchSocket(async (io, socket, messageData) => {
    const { chatId, content, recipientId, localId } = messageData;
    if (!chatId || !content || !recipientId) {
        socket.emit('socketError', {
            message: 'Chat ID, recipient ID, and message content are required',
            statusCode: 400,
        });
        return;
    }
    const message = {
        localId,
        chatId,
        senderId: socket.user._id,
        senderUsername: socket.user.username,
        content,
        timestamp: new Date(),
        status: MessageStatus.SENT,
    };
    // Save the message in the database
    void Message.create(message);
    // Emit the message to the chat room
    io.to(chatId.toString()).emit('receiveMessage', message);
    // Save the notification to the database
    const notification = await Notification.create({
        userId: recipientId,
        senderId: socket.user._id,
        senderName: socket.user.fullName || 'Unknown',
        senderUsername: socket.user.username,
        type: 'newMessage',
        relatedChatId: chatId,
        content,
        isRead: false,
    });
    // Find the recipient's socket
    const recipientData = findSocketByUserId(recipientId.toString());
    if (recipientData) {
        // If the recipient is NOT in the chat room, send a notification
        console.log('recipientData', recipientData);
        if (!recipientData.rooms.has(chatId)) {
            io.to(recipientData.socketId).emit('newNotification', notification);
        }
    }
    else {
        console.log('sending notif');
        // Send a push notification if the user is offline
        sendPushNotification(recipientId.toString(), notification);
    }
});
// Handle user disconnecting from WebSocket
export const handleDisconnect = catchSocket(async (io, socket) => {
    userSockets.delete(socket.user._id.toString());
    console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
});
// can be debounced
export const sendPushNotification = async (userId, notificationData) => {
    try {
        const subscriptions = await WebPushSubscription.find({ userId }).lean();
        for (const { subscription } of subscriptions) {
            try {
                await webPush.sendNotification(subscription, JSON.stringify(notificationData));
            }
            catch (error) {
                if (error.statusCode === 410) {
                    // Remove only the expired subscription
                    await WebPushSubscription.deleteOne({ userId, subscription });
                }
                else {
                    console.error('Error sending push notification:', error);
                }
            }
        }
    }
    catch (error) {
        console.error('Failed to send push notification:', error);
    }
};
// Mark a Notification as Read
export const markNotificationAsRead = async (req, res) => {
    const { notificationId } = req.params;
    try {
        const notification = await Notification.findById(notificationId);
        if (!notification) {
            // Notification not found
            return new ApiError(responseMessages.GENERAL.FAIL, 500);
        }
        notification.isRead = true;
        await notification.save();
        // Notification marked as read
        return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        return new ApiError(responseMessages.GENERAL.FAIL, 500);
    }
};
// Get Unread Notifications for a User
export const getUnreadNotifications = async (req, res) => {
    const userId = req.user?.id;
    try {
        const notifications = await Notification.find({
            userId,
            isRead: false,
        }).lean();
        const data = { notifications };
        return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
    }
    catch (error) {
        console.error('Error fetching unread notifications:', error);
        return new ApiError(responseMessages.GENERAL.FAIL, 500);
    }
};
