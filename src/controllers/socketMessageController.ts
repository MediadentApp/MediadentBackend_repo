import {
  findSocketByUserId,
  sendPushNotification,
} from '@src/utils/socketUtils';
import { Request, Response, NextFunction } from 'express';
import mongoose, { ObjectId, ClientSession } from 'mongoose';
import webPush from 'web-push';

import config from '@src/config/config';
import userSockets from '@src/helper/socketMap';
import {
  Chat,
  GroupChat,
  Message,
  WebPushSubscription,
  User,
  Notification,
} from '@src/models/userMessages';
import User from '@src/models/userModel';
import Notification from '@src/models/userNotificationModel';
import AppError from '@src/utils/appError';
import catchAsync from '@src/utils/catchAsync';
import catchSocket from '@src/utils/catchSocket';
import { stringToObjectID, objectIdToString } from '@src/utils/util';

// Notification Configurations (moved to `config.ts`)
const {
  NOTIFICATION_TIMEOUT_DELAY,
  READ_NOTIFICATION_BATCH_THRESHOLD,
  DELETE_NOTIFICATION_BATCH_THRESHOLD,
} = config.notifications;

// Interface for Web Push Subscription
interface WebPushSubscriptionDoc {
  userId: mongoose.Types.ObjectId;
  subscription: object;
}

// Interface for Notifications
interface NotificationDoc {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  isRead: boolean;
}

interface AuthenticatedSocket extends Socket {
  user: {
    _id: mongoose.Types.ObjectId;
    username: string;
    fullName?: string;
  };
}

interface MessageData {
  chatId: string;
  content: string;
  recipientId: string;
}

// Store active sockets
const userSockets = new Map<string, string>();

interface NotificationToMark {
  notificationId?: ObjectId;
  userId: ObjectId;
  userBId?: ObjectId;
  type?: string;
}

interface ChatRequestBody {
  userBId: ObjectId;
  chatId?: ObjectId | null;
}

interface GroupChatRequestBody {
  groupId?: string;
  groupName: string;
  participants: string[];
  admins?: string[];
  groupPicture?: string;
}

interface LeaveGroupChatRequestBody {
  groupId: string;
}

interface NotificationPayload {
  userId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderUsername: string;
  type: string;
  relatedChatId: ObjectId;
  content: string;
  isRead: boolean;
}

interface SecondParticipantResponse {
  chatId: ObjectId;
  secondParticipant: {
    _id: ObjectId;
    profilePicture: string;
    firstName: string;
    lastName: string;
    fullName: string;
    username: string;
    email: string;
  };
}

// Batched Read Notifications
let readNotificationsToUpdate: {
  userId: mongoose.Types.ObjectId;
  userBId?: mongoose.Types.ObjectId;
  type?: string;
  notificationId?: mongoose.Types.ObjectId;
}[] = [];
let readNotificationTimeoutId: NodeJS.Timeout | undefined;

// Batched Delete Notifications
const notificationsToDelete: string[] = [];
let deleteNotificationTimeoutId: NodeJS.Timeout | undefined;

/**
 * Marks notifications as read and updates/deletes them in bulk.
 * @param notificationsToMarkAsRead - List of notifications to process.
 */
async function markNotificationsAsRead(
  notificationsToMarkAsRead: NotificationToMark[],
): Promise<void> {
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

// Web Push Configuration
webPush.setVapidDetails(
  'mailto:v3p51435@gmail.com',
  process.env.WEBPUSH_PUBLIC_KEY || '',
  process.env.WEBPUSH_PRIVATE_KEY || '',
);

/**
 * Finds a socket connection by user ID.
 * @param userId - The user ID.
 * @returns The socket instance or undefined.
 */
const findSocketByUserId = (userId: ObjectId): any =>
  userSockets.get(userId.toString());

interface ChatRequestBody {
  userBId: ObjectId;
  chatId?: ObjectId | null;
}

interface NotificationPayload {
  userId: ObjectId;
  senderId: ObjectId;
  senderName: string;
  senderUsername: string;
  type: string;
  relatedChatId: ObjectId;
  content: string;
  isRead: boolean;
}

interface GetMessagesRequestBody {
  chatId: string;
  oldestMessageDate?: string;
}

/**
 * Gets or creates a chat ID between two users.
 */
export const getChatID = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const {
      _id: userAId,
      fullName: userAFullName,
      username: userAUsername,
    } = req.user as any;
    const { userBId, chatId = null } = req.body as ChatRequestBody;
    const io = req.app.get('io');

    if (!userBId) {
      return next(new AppError('User ID is required', 400));
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
      return res.status(200).json({
        status: 'success',
        message: 'ChatID fetched successfully',
        data: { chatId: chat._id, userBId },
      });
    }

    // Ensure userB exists before creating a new chat
    const userB = await User.findById(userBId).select('_id firstName').lean();
    if (!userB) {
      return next(new AppError('User not found', 400));
    }

    let newChatId: ObjectId;
    const session: ClientSession = await mongoose.startSession();
    session.startTransaction();

    try {
      // Create a new chat with participants
      const newChat = await Chat.create(
        [{ participants: [userAId, userB._id], active: true }],
        { session },
      );
      newChatId = newChat[0]._id;

      // Update chat lists for both users
      await User.updateMany(
        { _id: { $in: [userAId, userB._id] } },
        { $addToSet: { 'chats.chatIds': newChatId } },
        { session },
      );

      await session.commitTransaction();
      session.endSession();

      console.log('New chat created:', newChatId);
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      return next(new AppError('Could not create chat', 500));
    }

    // Send notification to Recipient of new Chat
    const notificationData: NotificationPayload = {
      userId: userB._id,
      senderId: userAId,
      senderName: userAFullName,
      senderUsername: userAUsername,
      type: 'newChat',
      relatedChatId: newChatId,
      content: `${userB.firstName} sent you a message.`,
      isRead: false,
    };

    const notification = await Notification.create(notificationData);
    console.log('Notification created:', notification._id);

    const userBSocket = findSocketByUserId(userB._id);
    const userASocket = findSocketByUserId(userAId);

    if (userBSocket) {
      io.to(userBSocket.socketId).emit('newNotification', notification);
    } else {
      sendPushNotification(userB._id, notification);
    }

    if (userASocket) {
      io.to(userASocket.socketId).emit('newNotification', notification);
    } else {
      sendPushNotification(userAId, notification);
    }

    const updatedUserA = await User.findFullUser({ _id: userAId }).lean();

    res.status(200).json({
      status: 'success',
      message: 'ChatID created successfully',
      data: {
        chatId: newChatId,
        userBId: userB._id,
        updatedUser: updatedUserA,
      },
    });
  },
);

exports.chats = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { chatsIdArr } = req.body;
    if (!chatsIdArr) return next(new AppError('Chat IDs are required', 400));

    const chatIdArr = await Chat.find({ _id: { $in: chatsIdArr } });

    res.status(201).json({
      status: 'success',
      data: chatIdArr,
    });
  },
);

export const getSecondParticipants = catchAsync(
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { _id: userId } = req.user as any;
    const { chatIds } = req.body as { chatIds: string[] };

    // Validate input
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return next(new AppError('Chat IDs must be provided as an array', 400));
    }
    if (!userId) {
      return next(new AppError('User ID must be provided', 400));
    }

    const chatIdsObjectID = stringToObjectID(chatIds);
    const userIdObjectID = stringToObjectID(userId);

    // Use aggregation to find chats and exclude the current user from participants
    const chats: SecondParticipantResponse[] = await Chat.aggregate([
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

    const foundChatIds = new Set(chats.map((chat) => chat.chatId.toString()));
    const missingChatIds = chatIdsObjectID.filter(
      (id) => !foundChatIds.has(id.toString()),
    );

    if (missingChatIds.length > 0) {
      await User.updateOne(
        { _id: userIdObjectID },
        { $pullAll: { 'chats.chatIds': missingChatIds } },
      );
    }

    res.status(200).json({
      status: 'success',
      data: chats,
    });
  },
);

// Create or Retrieve Group Chat
export const groupChatId = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as any)._id as string;
    const {
      groupId,
      groupName,
      participants,
      admins = [],
      groupPicture,
    }: GroupChatRequestBody = req.body;

    if (!groupName || !participants || participants.length === 0) {
      return next(
        new AppError('Group name and participants are required', 400),
      );
    }

    let groupChat;

    if (groupId) {
      // Retrieve existing group chat
      groupChat = await GroupChat.findById(groupId);
      if (!groupChat) return next(new AppError('Chat group not found', 400));
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
        { $addToSet: { 'groups.groupChatIds': groupChat._id } },
      );
    }

    res.status(200).json({
      status: 'success',
      message: groupId
        ? 'Group chat retrieved successfully'
        : 'Group chat created successfully',
      data: { groupChat },
    });
  },
);

// Leave Group Chat
export const leaveGroupChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as any)._id as string;
    const { groupId }: LeaveGroupChatRequestBody = req.body;

    if (!groupId) {
      return next(new AppError('Group ID is required', 400));
    }

    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat) {
      return next(new AppError('Group chat not found', 400));
    }

    if (!groupChat.participants.includes(userId as unknown as ObjectId)) {
      return next(
        new AppError('You are not a participant of this group chat', 403),
      );
    }

    // Remove user from group participants
    groupChat.participants = groupChat.participants.filter(
      (participant) => participant.toString() !== userId.toString(),
    );
    await groupChat.save();

    // Update user document to remove the group chat ID
    await User.findByIdAndUpdate(
      userId,
      { $pull: { 'groups.groupChatIds': groupId } },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      message: 'You have left the group chat successfully',
      data: { groupChatId: groupId },
    });
  },
);

// !Not Working
export const leaveGroupChat = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    const userId = (req.user as any)._id.toString();
    const { groupId }: { groupId: string } = req.body;

    if (!groupId || !mongoose.Types.ObjectId.isValid(groupId)) {
      return next(new AppError('Invalid or missing Group ID', 400));
    }

    const groupChat = await GroupChat.findById(groupId);
    if (!groupChat) {
      return next(new AppError('Group chat not found', 400));
    }

    if (!groupChat.participants || !groupChat.participants.length) {
      return next(new AppError('Group chat data is corrupted', 500));
    }

    if (!groupChat.participants.map((id) => id.toString()).includes(userId)) {
      return next(
        new AppError('You are not a participant of this group chat', 403),
      );
    }

    // Remove user from participants
    groupChat.participants = groupChat.participants.filter(
      (participant) => participant.toString() !== userId,
    );
    groupChat.markModified('participants'); // Ensure Mongoose updates the array
    await groupChat.save();

    // Update user document
    await User.findByIdAndUpdate(
      userId,
      { $pull: { 'groups.groupChatIds': groupId } },
      { new: true },
    );

    res.status(200).json({
      status: 'success',
      message: 'You have left the group chat successfully',
      data: { groupChatId: groupId },
    });
  },
);

export const getMessagesByChatId = catchAsync(
  async (
    req: Request<{}, {}, GetMessagesRequestBody>,
    res: Response,
    next: NextFunction,
  ) => {
    const { chatId, oldestMessageDate } = req.body;
    const limit = parseInt(config.chat.DEFAULT_MESSAGES_PER_PAGE, 10) || 20;

    // Validate chatId
    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return next(new AppError('Invalid chat ID', 400));
    }

    const query: { chatId: string; createdAt?: { $lt: Date } } = { chatId };
    if (oldestMessageDate && !isNaN(Date.parse(oldestMessageDate))) {
      query.createdAt = { $lt: new Date(oldestMessageDate) };
    }

    const messages = await Message.find(query)
      .sort('-createdAt')
      .limit(limit)
      .lean();

    if (messages.length === 0) {
      return res.status(200).json({
        status: 'success',
        message: 'No more messages found',
        results: 0,
        data: {
          chatId,
          messages: [],
          oldestMessageDate: null,
        },
      });
    }

    const newOldestMessageDate = messages[messages.length - 1].createdAt;

    res.status(200).json({
      status: 'success',
      results: messages.length,
      data: {
        chatId,
        messages,
        oldestMessageDate: newOldestMessageDate,
      },
    });
  },
);

// Subscribe to push notifications
export const subscribe = catchAsync(async (req: Request, res: Response) => {
  const subscription = req.body;

  await WebPushSubscription.findOneAndUpdate(
    { userId: req.user._id },
    { subscription },
    { upsert: true, new: true },
  );

  res.status(200).json({ message: 'Subscription saved successfully' });
});

// Delete notifications in batch with threshold
export const deleteNotification = catchSocket(
  async (io: Socket, socket: Socket, notificationId: string) => {
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
    } else {
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
  },
);

// Mark notifications as read in batch with threshold
export const readNotification = catchSocket(
  async (
    io: Socket,
    socket: Socket,
    {
      userBId = null,
      type = null,
      notificationId = null,
    }: { userBId?: string; type?: string; notificationId?: string },
    userId: string,
  ) => {
    readNotificationsToUpdate.push({
      userId: new mongoose.Types.ObjectId(userId),
      userBId: userBId ? new mongoose.Types.ObjectId(userBId) : undefined,
      type,
      notificationId: notificationId
        ? new mongoose.Types.ObjectId(notificationId)
        : undefined,
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
  },
);

// Handle sending a message
export const handleSendMessage = catchSocket(
  async (io: Server, socket: AuthenticatedSocket, messageData: MessageData) => {
    const { chatId, content, recipientId } = messageData;

    if (!chatId || !content || !recipientId) {
      return socket.emit('socketError', {
        message: 'Chat ID, recipient ID, and message content are required',
        statusCode: 400,
      });
    }

    // Save the message in the database
    const message = await Message.create({
      chatId,
      senderId: socket.user._id,
      senderUsername: socket.user.username,
      content,
      status: {
        sent: true,
        delivered: false,
        read: false,
      },
    });

    // Emit the message to the chat room
    io.to(chatId).emit('receiveMessage', {
      chatId,
      senderId: socket.user._id,
      senderUsername: socket.user.username,
      content,
      timestamp: new Date(),
      status: message.status,
    });

    // Save the notification to the database
    const notification = await Notification.create({
      userId: new mongoose.Types.ObjectId(recipientId),
      senderId: socket.user._id,
      senderName: socket.user.fullName || 'Unknown',
      senderUsername: socket.user.username,
      type: 'newMessage',
      relatedChatId: chatId,
      content,
      isRead: false,
    });

    // Find the recipient's socket
    const recipientData = findSocketByUserId(recipientId);
    if (recipientData) {
      // If the recipient is NOT in the chat room, send a notification
      if (!recipientData.rooms.has(chatId)) {
        io.to(recipientData.socketId).emit('newNotification', notification);
      }
    } else {
      // Send a push notification if the user is offline
      sendPushNotification(recipientId, notification);
    }
  },
);

// Handle user disconnecting from WebSocket
export const handleDisconnect = catchSocket(
  async (io: Server, socket: AuthenticatedSocket) => {
    userSockets.delete(socket.user._id.toString());
    console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
  },
);

export const sendPushNotification = async (
  userId: string,
  notificationData: object,
) => {
  try {
    const subscriptions: WebPushSubscriptionDoc[] =
      await WebPushSubscription.find({ userId }).lean();

    for (const { subscription } of subscriptions) {
      try {
        await webPush.sendNotification(
          subscription,
          JSON.stringify(notificationData),
        );
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
export const markNotificationAsRead = async (req: Request, res: Response) => {
  const { notificationId } = req.params;
  try {
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Failed to mark notification as read' });
  }
};

// Get Unread Notifications for a User
export const getUnreadNotifications = async (req: Request, res: Response) => {
  const userId = req.user?.id as string;
  try {
    const notifications: NotificationDoc[] = await Notification.find({
      userId,
      isRead: false,
    }).lean();
    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ message: 'Failed to fetch unread notifications' });
  }
};
