import appConfig from '#src/config/appConfig.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import userSockets from '#src/helper/socketMap.js';
import { Chat, GroupChat, Message, WebPushSubscription } from '#src/models/userMessages.js';
import User from '#src/models/userModel.js';
import Notification from '#src/models/userNotificationModel.js';
import { AppRequestBody } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import { MessageStatus } from '#src/types/enum.js';
import {
  IAuthenticatedSocket,
  IChatRequestBody,
  IGetMessagesRequestBody,
  IGroupChatRequestBody,
  ILeaveGroupChatRequestBody,
  IMessageData,
  INotificationPayload,
  IReadNotification,
  ISecondParticipantResponse,
  IUserB,
} from '#src/types/request.socket.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import catchSocket from '#src/utils/catchSocket.js';
import { stringToObjectID } from '#src/utils/index.js';
import { Request, NextFunction } from 'express';
import mongoose, { ObjectId, ClientSession } from 'mongoose';
import { Server } from 'socket.io';
import webPush from 'web-push';

/**
 * socket: AuthenticatedSocket → Represents a single user's connection. Used for emitting events to that specific socket.
 * io: Server → Represents the whole server. Used for emitting events to rooms, broadcasting messages, and managing multiple connections.
 */

const { NOTIFICATION_TIMEOUT_DELAY, READ_NOTIFICATION_BATCH_THRESHOLD, DELETE_NOTIFICATION_BATCH_THRESHOLD } =
  appConfig.notification;

// Batched Read Notifications
let readNotificationsToUpdate: IReadNotification[] = [];
let readNotificationTimeoutId: NodeJS.Timeout | undefined;

// Batched Delete Notifications
let notificationsToDelete: string[] = [];
let deleteNotificationTimeoutId: NodeJS.Timeout | undefined;

/**
 * Marks notifications as read and updates/deletes them in bulk.
 * @param notificationsToMarkAsRead - List of notifications to process.
 */
async function markNotificationsAsRead(notificationsToMarkAsRead: IReadNotification[]): Promise<void> {
  const bulkOperations = notificationsToMarkAsRead
    .map(({ notificationId, userId, userBId, type }) => {
      if (notificationId) {
        return {
          updateOne: {
            filter: { _id: notificationId, userId },
            update: { $set: { isRead: true, isPushSent: false } },
          },
        };
      }

      if (userBId && type) {
        if (type === 'newMessage') {
          return {
            deleteMany: {
              filter: { userId, senderId: userBId, type },
            },
          };
        }
        return {
          updateMany: {
            filter: { userId, senderId: userBId, type },
            update: { $set: { isRead: true, isPushSent: false } },
          },
        };
      }

      return null;
    })
    .filter((op): op is Exclude<typeof op, null> => op !== null); // Ensures non-null values

  try {
    if (bulkOperations.length > 0) {
      await Notification.bulkWrite(bulkOperations);
    }
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

const VAPID_WEBPUSH_PUBLIC_KEY = process.env.WEBPUSH_PUBLIC_KEY;
const VAPID_WEBPUSH_PRIVATE_KEY = process.env.WEBPUSH_PRIVATE_KEY;
const VAPID_WEBPUSH_EMAIL = process.env.WEBPUSH_EMAIL;

// console.log('VAPID keys:', VAPID_WEBPUSH_PUBLIC_KEY, VAPID_WEBPUSH_PRIVATE_KEY, VAPID_WEBPUSH_EMAIL);

if (!VAPID_WEBPUSH_PUBLIC_KEY || !VAPID_WEBPUSH_PRIVATE_KEY) {
  throw new Error('VAPID keys are missing.');
}

if (Buffer.from(VAPID_WEBPUSH_PUBLIC_KEY, 'base64').length !== 65) {
  throw new Error('Invalid VAPID public key. It should be 65 bytes when decoded.');
}

// Web Push Configuration
webPush.setVapidDetails(VAPID_WEBPUSH_EMAIL as string, VAPID_WEBPUSH_PUBLIC_KEY, VAPID_WEBPUSH_PRIVATE_KEY);

/**
 * Finds a socket connection by user ID.
 * @param userId - The user ID.
 * @returns The socket instance or undefined.
 */
const findSocketByUserId = (userId: string): any => userSockets.get(userId);

/**
 * Gets or creates a chat ID between two users.
 */
export const getChatID = catchAsync(
  async (req: AppRequestBody<IChatRequestBody>, res: AppResponse, next: NextFunction) => {
    const { _id: userAId, fullName: userAFullName, username: userAUsername } = req.user as any;
    const { userBId, chatId = null } = req.body;
    const io = req.app.get('io');

    if (!userBId) {
      return next(new ApiError(responseMessages.SOCKET.USER_ID_INVALID, 400, ErrorCodes.SOCKET.USER_NOT_FOUND));
    }

    // Find chat either by `chatId` or by `participants`
    const chat = chatId
      ? await Chat.findOne({
          _id: chatId,
          participants: { $all: [userAId, userBId], $size: 2 },
          active: true,
        }).lean()
      : await Chat.findOne({
          participants: { $all: [userAId, userBId] },
          'participants.2': { $exists: false }, // Ensure it's a two-participant chat
          active: true,
        }).lean();

    if (chat) {
      return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, { chatId: chat._id, userBId });
    }

    // Ensure userB exists before creating a new chat
    const userB = await User.findById(userBId).select('_id firstName').lean();
    if (!userB) {
      return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }

    let newChatId: ObjectId;
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create a new chat with participants
      const newChat = await Chat.create([{ participants: [userAId, userB._id], active: true }], { session });
      newChatId = newChat[0]._id as ObjectId;

      // Update chat lists for both users
      await User.updateMany(
        { _id: { $in: [userAId, userB._id] } },
        { $addToSet: { 'chats.chatIds': newChatId } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      console.log('New chat created:', newChatId);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return next(new ApiError(responseMessages.SOCKET.COULD_NOT_CREATE_CHAT, 500));
    }

    // Send notification to Recipient of new Chat
    const notificationData: INotificationPayload = {
      userId: userB._id.toString(),
      senderId: userAId,
      senderName: userAFullName,
      senderUsername: userAUsername,
      type: 'newChat',
      relatedChatId: newChatId.toString(),
      content: `${userB.firstName} sent you a message.`,
      isRead: false,
    };

    const notification = await Notification.create(notificationData);
    console.log('Notification created:', notification._id);

    const userBSocket = findSocketByUserId(userB._id.toString());
    const userASocket = findSocketByUserId(userAId);

    if (userBSocket) {
      io.to(userBSocket.socketId).emit('newNotification', notification);
    } else {
      sendPushNotification(String(userB._id), notification);
    }

    if (userASocket) {
      io.to(userASocket.socketId).emit('newNotification', notification);
    } else {
      sendPushNotification(userAId, notification);
    }

    const updatedUserA = await User.findFullUser({ _id: userAId });

    return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, {
      chatId: newChatId,
      userBId,
      updatedUser: updatedUserA,
    });
  }
);

export const chats = catchAsync(async (req: Request, res: AppResponse, next: NextFunction) => {
  const { chatsIdArr } = req.body;
  if (!chatsIdArr)
    return next(new ApiError(responseMessages.SOCKET.CHAT_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));

  const chatIdArr = await Chat.find({ _id: { $in: chatsIdArr } });

  return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, {
    chatIdArr,
  });
});

export const getSecondParticipants = catchAsync(async (req: Request, res: AppResponse, next: NextFunction) => {
  const { _id: userId } = req.user as any;
  const { chatIds } = req.body as { chatIds: string[] };

  // Validate input
  if (!Array.isArray(chatIds) || chatIds.length === 0) {
    return next(
      new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT)
    );
  }
  if (!userId) {
    return next(new ApiError(responseMessages.SOCKET.USER_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
  }

  const chatIdsObjectID = stringToObjectID(chatIds) as unknown as ObjectId[];
  const userIdObjectID = stringToObjectID(userId);

  // Use aggregation to find chats and exclude the current user from participants
  const chats: ISecondParticipantResponse[] = await Chat.aggregate([
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
export const groupChatId = catchAsync(async (req: Request, res: AppResponse, next: NextFunction) => {
  const userId = (req.user as any)._id as string;
  const { groupId, groupName, participants, admins = [], groupPicture }: IGroupChatRequestBody = req.body;

  if (!groupName || !participants || participants.length === 0) {
    return next(
      new ApiError(responseMessages.SOCKET.GROUP_CREATION_DATA_REQUIRED, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT)
    );
  }

  let groupChat;

  if (groupId) {
    // Retrieve existing group chat
    groupChat = await GroupChat.findById(groupId);
    if (!groupChat)
      return next(
        new ApiError(responseMessages.SOCKET.GROUP_CREATION_DATA_REQUIRED, 400, ErrorCodes.SOCKET.CHAT_NOT_FOUND)
      );
  } else {
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
    await User.updateMany(
      { _id: { $in: uniqueParticipants } },
      { $addToSet: { 'groups.groupChatIds': groupChat._id } }
    );
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, {
    groupChat,
  });
});

// Leave Group Chat
export const leaveGroupChat = catchAsync(async (req: Request, res: AppResponse, next: NextFunction) => {
  const userId = req.user._id;
  const { groupId }: ILeaveGroupChatRequestBody = req.body;

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

export const getMessagesByChatId = catchAsync(
  async (req: AppRequestBody<IGetMessagesRequestBody>, res: AppResponse, next: NextFunction) => {
    const { chatId, oldestMessageDate } = req.body;
    const limit = appConfig.chat.DEFAULT_MESSAGES_PER_PAGE || 20;

    // Validate chatId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return next(new ApiError(responseMessages.SOCKET.CHAT_ID_INVALID, 400, ErrorCodes.SOCKET.MISSING_INVALID_INPUT));
    }

    const query: { chatId: string; createdAt?: { $lt: Date } } = { chatId };
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
  }
);

// Subscribe to push notifications
export const subscribe = catchAsync(async (req: Request, res: AppResponse) => {
  const subscription = req.body;

  await WebPushSubscription.findOneAndUpdate({ userId: req.user._id }, { subscription }, { upsert: true, new: true });

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

// Delete notifications in batch with threshold
export const deleteNotification = catchSocket(
  async (_io: Server, _socket: IAuthenticatedSocket, notificationId: string) => {
    if (!notificationsToDelete.includes(notificationId)) {
      notificationsToDelete.push(notificationId);
    }

    if (notificationsToDelete.length >= DELETE_NOTIFICATION_BATCH_THRESHOLD) {
      if (deleteNotificationTimeoutId) clearTimeout(deleteNotificationTimeoutId);

      const deletedCount = await Notification.deleteMany({
        _id: { $in: notificationsToDelete },
      });

      notificationsToDelete = []; // Reset batch
      console.log('Deleted notifications:', deletedCount);
    } else {
      if (deleteNotificationTimeoutId) clearTimeout(deleteNotificationTimeoutId);

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
  }
);

// Mark notifications as read in batch with threshold
export const readNotification = catchSocket(
  async (_io: Server, _socket: IAuthenticatedSocket, { userBId, type, notificationId }: IUserB, userId: string) => {
    if (!userBId || !type || !notificationId || !userId) {
      console.log('Missing userBId, type or notificationId');
      return;
    }

    readNotificationsToUpdate.push({
      userId: userId,
      userBId: userBId,
      type,
      notificationId: notificationId,
    });

    if (readNotificationsToUpdate.length >= READ_NOTIFICATION_BATCH_THRESHOLD) {
      if (readNotificationTimeoutId) clearTimeout(readNotificationTimeoutId);

      await markNotificationsAsRead(readNotificationsToUpdate);
      readNotificationsToUpdate = []; // Reset batch
    } else {
      if (readNotificationTimeoutId) clearTimeout(readNotificationTimeoutId);

      readNotificationTimeoutId = setTimeout(async () => {
        if (readNotificationsToUpdate.length > 0) {
          await markNotificationsAsRead(readNotificationsToUpdate);
          readNotificationsToUpdate = []; // Reset batch
        }
      }, NOTIFICATION_TIMEOUT_DELAY);
    }
  }
);

// Handle sending a message
export const handleSendMessage = catchSocket(
  async (io: Server, socket: IAuthenticatedSocket, messageData: IMessageData): Promise<void> => {
    const { chatId, content, recipientId, localId } = messageData;

    if (!chatId || !content || !recipientId) {
      socket.emit('socketError', {
        message: 'Chat ID, recipient ID, and message content are required',
        statusCode: 400,
      });
      return; // Explicitly return to satisfy void return type
    }

    // Save the message in the database
    const message = await Message.create({
      chatId,
      senderId: socket.user._id,
      senderUsername: socket.user.username,
      content,
      status: MessageStatus.SENT,
    });

    // Emit the message to the chat room
    io.to(chatId.toString()).emit('receiveMessage', {
      localId,
      chatId,
      senderId: socket.user._id,
      senderUsername: socket.user.username,
      content,
      timestamp: new Date(),
      status: MessageStatus.SENT,
    });

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
      if (!recipientData.rooms.has(chatId)) {
        io.to(recipientData.socketId).emit('newNotification', notification);
      }
    } else {
      // Send a push notification if the user is offline
      sendPushNotification(recipientId.toString(), notification);
    }
  }
);

// Handle user disconnecting from WebSocket
export const handleDisconnect = catchSocket(async (io: Server, socket: IAuthenticatedSocket) => {
  userSockets.delete(socket.user._id.toString());
  console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
});

export const sendPushNotification = async (userId: string, notificationData: object) => {
  try {
    const subscriptions = await WebPushSubscription.find({ userId }).lean();

    for (const { subscription } of subscriptions) {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(notificationData));
      } catch (error: any) {
        if (error.statusCode === 410) {
          // Remove only the expired subscription
          await WebPushSubscription.deleteOne({ userId, subscription });
        } else {
          console.error('Error sending push notification:', error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
};

// Mark a Notification as Read
export const markNotificationAsRead = async (req: Request, res: AppResponse) => {
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
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return new ApiError(responseMessages.GENERAL.FAIL, 500);
  }
};

// Get Unread Notifications for a User
export const getUnreadNotifications = async (req: Request, res: AppResponse) => {
  const userId = req.user?.id as string;
  try {
    const notifications = await Notification.find({
      userId,
      isRead: false,
    }).lean();

    const data = { notifications };
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    return new ApiError(responseMessages.GENERAL.FAIL, 500);
  }
};
