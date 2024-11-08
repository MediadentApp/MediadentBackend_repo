const userSockets = require("@src/helper/socketMap");
const { Chat, GroupChat, Message, WebPushSubscription } = require("@src/models/userMessages");
const User = require("@src/models/userModel");
const Notification = require("@src/models/userNotificationModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const catchSocket = require("@src/utils/catchSocket");
const { stringToObjectID, objectIdToString } = require("@src/utils/util");
const { default: mongoose } = require("mongoose");
const webPush = require("web-push");

// !Shift all to config files
// Notification configs
const NOTIFICATION_TIMEOUT_DELAY = 800; // Timeout for batch update,delete
// Read Notifications configs
const readNotificationsToUpdate = [];
const READ_NOTIFICATION_BATCH_THRESHOLD = 5; // Threshold for immediate update
let readNotificationTimeoutId;
// Delete Notification configs
const notificationsToDelete = [];
const DELETE_NOTIFICATION_BATCH_THRESHOLD = 5; // Threshold for immediate delete
let deleteNotificationTimeoutId;

async function markNotificationsAsRead(notificationsToMarkAsRead) {
  const bulkOperations = notificationsToMarkAsRead.map(
    ({ notificationId, userId, userBId, type }) => {
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
          // If the type is 'newMessage', delete the message notifications
          return {
            deleteMany: {
              filter: { userId, senderId: userBId, type },
            },
          };
        } else {
          // For other types, just update the notification
          return {
            updateMany: {
              filter: { userId, senderId: userBId, type },
              update: { $set: { isRead: true, isPushSent: false } },
            },
          };
        }
      }

      return null;
    }
  ).filter(Boolean);

  try {
    await Notification.bulkWrite(bulkOperations);
  } catch (error) {
    console.error('Error marking notifications as read:', error);
  }
}

// const vapidKeys = webPush.generateVAPIDKeys();
webPush.setVapidDetails(
  "mailto:v3p51435@gmail.com",
  process.env.WEBPUSH_PUBLIC_KEY,
  process.env.WEBPUSH_PRIVATE_KEY
);

const findSocketByUserId = (userId) => {
  const userIdString = userId.toString();
  return userSockets.get(userIdString);
};

exports.getChatID = catchAsync(async (req, res, next) => {
  const { _id: userAId, fullName: userAFullName, username: userAUsername } = req.user;
  const { userBId, chatId = null } = req.body;
  const io = req.app.get('io');

  if (!userBId) {
    return next(new AppError('User ID is required', 400));
  }

  // Find chat either by `chatId` or by `participants`
  const chat = chatId
    ? await Chat.findOne({
      _id: chatId,
      participants: { $all: [userAId, userBId], $size: 2 },
      active: true
    }).lean()
    : await Chat.findOne({
      participants: { $all: [userAId, userBId] },
      'participants.2': { $exists: false }, // Ensure it's a two-participant chat
      active: true
    }).lean();

  // If chat is found, return immediately
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

  // Use transaction to ensure atomicity for chat creation and user updates
  const session = await mongoose.startSession();
  session.startTransaction();

  let newChatId;
  try {
    console.log(
      'Creating a new chat with participants:',
      userAId,
      userB._id
    );

    // Create a new chat with participants
    const newChat = await Chat.create([{ participants: [userAId, userB._id], active: true }], { session });
    newChatId = newChat[0]._id;

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
    return next(new AppError('Could not create chat', 500));
  }

  // Send notification to Recipient of new Chat
  const notification = await Notification.create({
    userId: userB._id,
    senderId: userAId,
    senderName: userAFullName,
    senderUsername: userAUsername,
    type: 'newChat',
    relatedChatId: newChatId,
    content: `${userB.firstName} sent you a message.`,
    isRead: false,
  });

  console.log('Notification created:', notification._id);

  const recipientData = findSocketByUserId(userB._id);
  if (recipientData) {
    if (!recipientData.rooms.has(chatId)) {
      io.to(recipientData.socketId).emit('newNotification', notification);
    }
  } else {
    sendPushNotification(userB._id, notification);
  }

  const updatedUserA = await User.findFullUser({ _id: userAId }).lean();

  return res.status(200).json({
    status: 'success',
    message: 'ChatID created successfully',
    data: { chatId: newChatId, userBId: userB._id, updatedUser: updatedUserA },
  });
});

exports.chats = catchAsync(async (req, res, next) => {
  const { chatsIdArr } = req.body;
  if (!chatsIdArr) return next(new AppError('Chat IDs are required', 400));

  const chatIdArr = await Chat.find({ _id: { $in: chatsIdArr } });

  res.status(201).json({
    status: 'success',
    data: chatIdArr
  });
});

exports.getSecondParticipants = catchAsync(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { chatIds } = req.body;

  // Validate input
  if (!chatIds || !Array.isArray(chatIds)) {
    return next(new AppError('Chat IDs must be provided as an array', 400));
  }
  if (!userId) {
    return next(new AppError('User ID must be provided', 400));
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
        from: 'users', // Name of the participants collection
        localField: 'participants',
        foreignField: '_id',
        as: 'participantsDetails',
      },
    },
    {
      $unwind: {
        path: '$participantsDetails',
        preserveNullAndEmptyArrays: true, // Keep chats even if no participants are found
      },
    },
    {
      $match: {
        'participantsDetails._id': { $ne: userIdObjectID }, // Exclude the current user
      },
    },
    {
      $group: {
        _id: '$_id', // Group by chat ID
        secondParticipant: { $first: '$participantsDetails' }, // Get the first participant (not the current user)
      },
    },
    {
      $project: {
        chatId: '$_id', // Rename _id to chatId
        secondParticipant: {
          _id: '$secondParticipant._id',
          profilePicture: '$secondParticipant.profilePicture',
          firstName: '$secondParticipant.firstName',
          lastName: '$secondParticipant.lastName',
          fullName: '$secondParticipant.fullName',
          username: '$secondParticipant.username',
          email: '$secondParticipant.email',
        },
      },
    },
    {
      $group: {
        _id: null,
        result: { $push: '$$ROOT' }, // Collect all result entries
      },
    },
    {
      $addFields: {
        missingChatIds: {
          $filter: {
            input: chatIdsObjectID,
            as: 'id',
            cond: { $not: { $in: ['$$id', '$result.chatId'] } }, // Identify missing chat IDs
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        result: 1,
        missingChatIds: 1,
      },
    },
  ]);

  const { result, missingChatIds } = chats[0] || { result: [], missingChatIds: [] };

  if (missingChatIds.length > 0) {
    await User.updateOne(
      { _id: userId },
      { $pullAll: { 'chats.chatIds': missingChatIds } } // Remove missing chat IDs
      // { $pull: { 'chats.chatIds': { $in: missingChatIds } } } // Remove missing chat IDs
    );
  }

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

exports.groupChatId = catchAsync(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { groupId, groupName, participants, admins, groupPicture } = req.body;

  if (!groupName || !participants || participants.length === 0) {
    return next(new AppError('Group name and participants are required', 400));
  }

  // Check if a group chat already exists
  let groupChat;
  if (groupId) {
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

    // Update the user documents to include the new groupChatId
    await User.updateMany(
      { _id: { $in: uniqueParticipants } },
      { $addToSet: { 'groups.groupChatIds': groupChat._id } } // Ensure this is correct according to your User schema
    );
  }

  res.status(200).json({
    status: 'success',
    message: groupId ? 'Group chat retrieved successfully' : 'Group chat created successfully',
    data: {
      groupChat
    }
  });
});

exports.leaveGroupChat = catchAsync(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { groupId } = req.body;

  if (!groupId) {
    return next(new AppError('Group ID is required', 400));
  }

  // Find the group chat by ID
  const groupChat = await GroupChat.findById(groupId);
  if (!groupChat) {
    return next(new AppError('Group chat not found', 400));
  }

  // Check if the user is a participant of the group chat
  if (!groupChat.participants.includes(userId)) {
    return next(new AppError('You are not a participant of this group chat', 403));
  }

  // Remove the user from the group chat participants
  groupChat.participants = groupChat.participants.filter(participant => participant.toString() !== userId.toString());
  await groupChat.save();

  // Update the user document to remove the group chat ID
  await User.findByIdAndUpdate(
    userId,
    { $pull: { 'chats.groupChatIds': groupId } },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'You have left the group chat successfully',
    data: {
      groupChatId: groupId
    }
  });
});

// !Not Working
exports.leaveGroupChat = catchAsync(async (req, res, next) => {
  const { _id: userId } = req.user;
  const { groupId } = req.body;

  if (!groupId) {
    return next(new AppError('Group ID is required', 400));
  }

  // Find the group chat by ID
  const groupChat = await GroupChat.findById(groupId);
  if (!groupChat) {
    return next(new AppError('Group chat not found', 400));
  }

  // Check if the user is a participant of the group chat
  if (!groupChat.participants.includes(userId)) {
    return next(new AppError('You are not a participant of this group chat', 403));
  }

  // Remove the user from the group chat participants
  groupChat.participants = groupChat.participants.filter(participant => participant.toString() !== userId.toString());
  await groupChat.save();

  // Update the user document to remove the group chat ID
  await User.findByIdAndUpdate(
    userId,
    { $pull: { 'chats.groupChatIds': groupId } },
    { new: true }
  );

  res.status(200).json({
    status: 'success',
    message: 'You have left the group chat successfully',
    data: {
      groupChatId: groupId
    }
  });
});

exports.getMessagesByChatId = catchAsync(async (req, res, next) => {
  const { chatId, page = 1, count = 25 } = req.body;

  if (!chatId) {
    return next(new AppError('Chat ID is required', 400));
  }

  const pageNum = parseInt(page, 10);
  const limit = parseInt(count, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return next(new AppError('Invalid page number', 400));
  }

  if (isNaN(limit) || limit < 1) {
    return next(new AppError('Invalid count value', 400));
  }

  const skip = (pageNum - 1) * limit;

  const messages = await Message.find({ chatId })
    .sort({ timestamp: 1 });
  // .skip(skip)
  // .limit(limit);

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      chatId,
      messages
    }
  });
});

// Controller to handle user subscription to push notifications
exports.subscribe = catchAsync(async (req, res) => {
  const subscription = req.body;

  await WebPushSubscription.findOneAndUpdate(
    { userId: req.user._id },
    { subscription },
    { upsert: true, new: true }
  );
  res.status(200).json({ message: "Subscription saved successfully" });
});

exports.deleteNotification = catchSocket(async (io, socket, notificationId) => {
  if (!notificationsToDelete.includes(notificationId)) {
    notificationsToDelete.push(notificationId);
  }

  // If the delete size exceeds the threshold, immediately delete
  if (notificationsToDelete.length >= DELETE_NOTIFICATION_BATCH_THRESHOLD) {
    clearTimeout(deleteNotificationTimeoutId); // Clear the existing timeout
    const deletedCount = await Notification.deleteMany({
      _id: { $in: notificationsToDelete },
    });
    notificationsToDelete.length = 0; // Clear the batch
    console.log('Deleted notifications:', deletedCount);
  } else {
    // Set or reset the timeout for batch delete
    clearTimeout(deleteNotificationTimeoutId);
    deleteNotificationTimeoutId = setTimeout(async () => {
      if (notificationsToDelete.length > 0) {
        const deletedCount = await Notification.deleteMany({
          _id: { $in: notificationsToDelete },
        });
        notificationsToDelete.length = 0; // Clear the batch
        console.log('Deleted notifications:', deletedCount);
      }
    }, NOTIFICATION_TIMEOUT_DELAY);
  }
});

exports.readNotification = catchSocket(async (io, socket, { userBId = null, type = null, notificationId = null }, userId) => {

  readNotificationsToUpdate.push({ userId, userBId, type, notificationId });

  if (readNotificationsToUpdate.length >= READ_NOTIFICATION_BATCH_THRESHOLD) {
    // clearTimeout(readNotificationTimeoutId);
    await markNotificationsAsRead(readNotificationsToUpdate);
  } else {
    clearTimeout(readNotificationTimeoutId);
    readNotificationTimeoutId = setTimeout(() => markNotificationsAsRead(readNotificationsToUpdate), NOTIFICATION_TIMEOUT_DELAY);
  }
});

exports.handleSendMessage = catchSocket(async (io, socket, messageData) => {
  const { chatId, content, recipientId } = messageData;

  if (!chatId || !content || !recipientId) {
    return socket.emit('socketError', {
      message: 'Chat ID and message content are required',
      statusCode: 400
    });
  }

  // Save the message to the database
  const message = await Message.create({
    chatId,
    senderId: socket.user._id,
    senderUsername: socket.user.username,
    content,
    status: {
      sent: true,
      delivered: false,
      read: false
    }
  });

  // Emit the message to the relevant chat room after saving
  io.to(chatId).emit('receiveMessage', {
    chatId,
    senderId: socket.user._id,
    senderUsername: socket.user.username,
    content,
    timestamp: new Date(),
    status: message.status
  });

  // Save the notification to the database
  const notification = await Notification.create({
    userId: recipientId,
    senderId: socket.user._id,
    senderName: socket.user.fullName,
    senderUsername: socket.user.username,
    type: 'newMessage',
    relatedChatId: chatId,
    content,
    isRead: false
  });

  // Find the recipient's socket
  const recipientData = findSocketByUserId(recipientId);
  if (recipientData) {
    // Check if the recipient is in the chat room
    if (!recipientData.rooms.has(chatId)) {
      io.to(recipientData.socketId).emit('newNotification', notification);
    }
  } else {
    sendPushNotification(recipientId, notification);
  }
});;

exports.handleDisconnect = catchSocket(async (io, socket) => {
  userSockets.delete(objectIdToString(socket.user._id));
  console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
});

const sendPushNotification = async (userId, notificationData) => {
  try {
    const subscriptions = await WebPushSubscription.find({ userId });

    for (const { subscription } of subscriptions) {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(notificationData));
      } catch (error) {
        if (error.statusCode === 410) {
          await WebPushSubscription.deleteOne({ userId });
        } else {
          console.error('Error sending notification:', error);
        }
      }
    }
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
};

// Controller to handle marking a notification as read
exports.markNotificationAsRead = async (req, res) => {
  const { notificationId } = req.params;
  try {
    // Find and update notification to mark it as read
    const notification = await Notification.findById(notificationId);
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    notification.isRead = true;
    await notification.save();
    res.status(200).json({ message: "Notification marked as read" });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ message: "Failed to mark notification as read" });
  }
};

// Controller to get unread notifications for a user
exports.getUnreadNotifications = async (req, res) => {
  const userId = req.user.id;
  try {
    // Find unread notifications for the user
    const notifications = await Notification.find({ userId, isRead: false });
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    res.status(500).json({ message: "Failed to fetch unread notifications" });
  }
};

exports = { sendPushNotification };