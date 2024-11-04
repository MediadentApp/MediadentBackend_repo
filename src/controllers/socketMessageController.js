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
  const { _id: userAId, firstName } = req.user;
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
    })
    : await Chat.findOne({
      participants: { $all: [userAId, userBId] },
      'participants.2': { $exists: false }, // Ensure it's a two-participant chat
    });

  // If chat is found, return immediately
  if (chat) {
    return res.status(200).json({
      status: 'success',
      message: 'ChatID fetched successfully',
      data: { chatId: chat._id, userBId },
    });
  }

  // Ensure userB exists before creating a new chat
  const userBExists = await User.exists({ _id: userBId });
  if (!userBExists) {
    return next(new AppError('User not found', 400));
  }

  // Use transaction to ensure atomicity for chat creation and user updates
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create a new chat with participants
    const newChat = await Chat.create([{ participants: [userAId, userBId] }], { session });

    // Update chat lists for both users
    await User.updateMany(
      { _id: { $in: [userAId, userBId] } },
      { $addToSet: { 'chats.chatIds': newChat[0]._id } },
      { session }
    );

    await session.commitTransaction();
    session.endSession();

    try {
      // Send notification to Recipient of new Chat
      const notification = await Notification.create({
        userId: userBId,
        senderId: userAId,
        type: 'newChat',
        content: `${firstName} sent you a message.`,
        isRead: false,
        isPushSent: false
      });

      const recipientData = findSocketByUserId(userBId);
      if (recipientData?.socketId) {
        io.to(recipientData.socketId).emit('newNotification', {
          type: 'newChat',
          chatId: newChat[0]._id,
          notificationId: notification._id,
          senderId: userAId,
          timestamp: new Date(),
        });
      }

    } catch (error) {
      console.log(error);
    }

    const updatedUserA = await User.findById(userAId).select('+chats.chatIds +chats.groupChatIds');

    return res.status(200).json({
      status: 'success',
      message: 'ChatID created successfully',
      data: { chatId: newChat[0]._id, userBId, updatedUser: updatedUserA },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    return next(new AppError('Could not create chat', 500));
  }
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
        preserveNullAndEmptyArrays: true, // Keep chats with no participants
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
        _id: 1,
        secondParticipant: {
          _id: '$secondParticipant._id',
          firstName: '$secondParticipant.firstName',
          lastName: '$secondParticipant.lastName',
          email: '$secondParticipant.email',
        },
      },
    },
  ]);

  // Prepare the result
  const result = chats.map(chat => ({
    chatId: chat?._id,
    secondParticipant: chat?.secondParticipant,
  }));

  // Get the found chat IDs
  const foundChatIds = chats.map(chat => chat._id.toString());

  // Determine missing chat IDs
  const missingChatIds = chatIds.filter(chatId => !foundChatIds.includes(chatId));

  // If there are missing chat IDs, update the user's chat list in one go using updateMany
  if (missingChatIds.length > 0) {
    await User.updateOne(
      { _id: userId },
      { $pull: { 'chats.chatIds': { $in: missingChatIds.map(stringToObjectID) } } } // Remove missing chat IDs
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
  const { chatId } = req.body; // Assuming chatId is passed in the URL

  if (!chatId) {
    return next(new AppError('Chat ID is required', 400));
  }

  const messages = await Message.find({ chatId })
    // .populate('senderId') 
    .sort({ timestamp: 1 }); // Sort messages by timestamp in ascending order

  res.status(200).json({
    status: 'success',
    results: messages.length,
    data: {
      messages
    }
  });
});

// Controller to handle user subscription to push notifications
exports.subscribe = catchAsync(async (req, res) => {
  const subscription = req.body;
  // Save or update user subscription in the database
  await WebPushSubscription.findOneAndUpdate(
    { userId: req.user._id },
    { subscription },
    { upsert: true, new: true }
  );
  res.status(200).json({ message: "Subscription saved successfully" });
});

exports.deleteNotification = catchSocket(async (notificationId) => {
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

exports.readNotification = catchSocket(async (notificationId) => {
  if (!readNotificationsToUpdate.includes(notificationId)) {
    readNotificationsToUpdate.push(notificationId);
  }

  // If the batch size exceeds the threshold, immediately update
  if (readNotificationsToUpdate.length >= READ_NOTIFICATION_BATCH_THRESHOLD) {
    clearTimeout(readNotificationTimeoutId); // Clear the existing timeout
    await Notification.updateMany(
      { _id: { $in: readNotificationsToUpdate } },
      { $set: { isRead: true } }
    );
    readNotificationsToUpdate.length = 0; // Clear the batch
    console.log('Read notifications');
  } else {
    // Set or reset the timeout
    clearTimeout(readNotificationTimeoutId);
    readNotificationTimeoutId = setTimeout(async () => {
      if (readNotificationsToUpdate.length > 0) {
        await Notification.updateMany(
          { _id: { $in: readNotificationsToUpdate } },
          { $set: { read: true } }
        );
        readNotificationsToUpdate.length = 0; // Clear the batch
        console.log('Read notifications');
      }
    }, NOTIFICATION_TIMEOUT_DELAY);
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
    senderId: socket.user._id,
    senderUsername: socket.user.username,
    content,
    timestamp: new Date(),
    status: message.status
  });

  // Prepare the notification details
  const notification = {
    userId: recipientId,
    senderId: socket.user._id,
    senderName: socket.user.firstName + ' ' + socket.user.lastName,
    senderUsername: socket.user.username,
    type: 'newMessage',
    relatedChatId: chatId,
    content,
    isRead: false
  };

  // Find the recipient's socket
  const recipientData = findSocketByUserId(recipientId);

  if (recipientData) {
    // Check if the recipient is in the chat room
    if (recipientData.rooms.has(chatId)) {
      console.log(`Recipient ${recipientId} is in chat room ${chatId}, message emitted.`);
    } else {
      console.log('Sending new message notification to recipient');
      io.to(recipientData.socketId).emit('newNotification', {
        notificationId: null,
        content: notification.content,
        senderId: socket.user._id,
        timestamp: new Date(),
      });
    }
  } else {
    sendPushNotification(recipientId, notification);
  }

  // Save the notification to the database
  await Notification.create(notification);
});;

exports.handleDisconnect = catchSocket(async (io, socket) => {
  userSockets.delete(objectIdToString(socket.user._id));
  console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
});

// Function to send push notifications
const sendPushNotification = async (userId, notificationPayload) => {
  try {
    const userSubscriptions = await WebPushSubscription.find({ userId });

    for (const { subscription } of userSubscriptions) {
      await webPush.sendNotification(subscription, JSON.stringify(notificationPayload));
    }
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
};

// Controller to create and send a notification
exports.createAndSendNotification = async ({ userId, type, content, relatedChatId, relatedGroupId }) => {
  try {
    // Create notification in database
    const notification = await Notification.create({
      userId,
      type,
      content,
      relatedChatId,
      relatedGroupId,
      isRead: false,
      isPushSent: false
    });

    // Check for user's push subscription
    const subscription = await WebPushSubscription.findOne({ userId });
    if (subscription && !notification.isPushSent) {
      // Prepare the payload for the push notification
      const payload = {
        title: "New Notification",
        message: content,
        type: type
      };

      // Send push notification
      await sendPushNotification(subscription.subscription, payload);

      // Update notification as push-sent in the database
      notification.isPushSent = true;
      await notification.save();
    }
  } catch (error) {
    console.error("Error creating or sending notification:", error);
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