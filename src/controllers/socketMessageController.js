const { Chat, GroupChat, Message, MessageNotification, WebPushSubscription } = require("@src/models/userMessages");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const catchSocket = require("@src/utils/catchSocket");
const { stringToObjectID } = require("@src/utils/util");
const webPush = require("web-push");

// const vapidKeys = webPush.generateVAPIDKeys();
webPush.setVapidDetails(
  "mailto:v3p51435@gmail.com",
  process.env.WEBPUSH_PUBLIC_KEY,
  process.env.WEBPUSH_PRIVATE_KEY
);


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
  if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
    return next(new AppError('Chat IDs must be provided as a non-empty array', 400));
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

  if (chats.length === 0) {
    return next(new AppError('No valid second participants found for the provided chat IDs', 404));
  }

  // Prepare the result
  const result = chats.map(chat => ({
    chatId: chat._id,
    secondParticipant: chat.secondParticipant,
  }));

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

exports.getChatID = catchAsync(async (req, res, next) => {
  const { _id: userAId } = req.user;
  const { userBId } = req.body;

  if (!userBId) {
    return next(new AppError('User ID is required', 400));
  }

  const userB = await User.findById(userBId);
  if (!userB) {
    return next(new AppError('User not found', 400));
  }

  // Check if the chat exists between userA and userB
  let chat = await Chat.findOne({
    participants: { $all: [userAId, userBId] },
    'participants.2': { $exists: false } // Ensure it's only a two-participant chat
  });

  if (!chat) {
    // Create a new chat if one doesn't exist
    chat = await Chat.create({ participants: [userAId, userBId] });

    // Update userA and userB's chat IDs only if a new chat is created
    await User.findByIdAndUpdate(userAId, {
      $addToSet: { 'chats.chatIds': chat._id }
    }, { new: true, runValidators: false });

    userB.chats.chatIds.push(chat._id);
    userB.chats.chatIds = [...new Set(userB.chats.chatIds)];  // Ensure uniqueness
    await userB.save();
  }

  res.status(200).json({
    status: 'success',
    message: 'ChatID fetched successfully',
    data: {
      chatId: chat._id,
      userA: req.user,
      userB
    }
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

exports.handleSendMessage = catchSocket(async (io, socket, messageData) => {
  const { chatId, content, recipientId } = messageData;

  if (!chatId || !content || !recipientId) {
    return socket.emit('error', {
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
      delivered: false, // Can be updated based on actual delivery
      read: false
    }
  });

  // Emit the message to the relevant chat room after saving
  io.to(chatId).emit('receiveMessage', {
    senderId: socket.user._id,
    senderUsername: socket.user.username,
    content,
    timestamp: new Date(),
    status: message.status // Send message status as well
  });

  // Store notification details in a local state until the user disconnects
  const notification = {
    userId: recipientId,
    type: 'message',
    relatedChatId: chatId,
    content: `${socket.user.username} sent you a message.`,
    isRead: false
  };

  // Check if the recipient is connected
  const recipientSocket = findSocketByUserId(recipientId); // Implement this function to find the socket by user ID

  if (recipientSocket) {
    // If the recipient is online, send them the notification
    recipientSocket.emit('newMessageNotification', {
      notificationId: null, // Or handle this if you generate an ID before saving
      content: notification.message,
      senderId: socket.user._id,
      timestamp: new Date(),
    });

    //     // Add notification to a local array
    // socket.notifications = socket.notifications || [];
    // socket.notifications.push(notification);
  } else {
    // If the recipient is offline, save the notification to the database
    await MessageNotification.create(notification);
    console.log(`Saved notification for ${recipientId}: ${notification.message}`);
  }
});

exports.handleDisconnect = catchSocket(async (io, socket) => {
  // Check if notifications have been viewed
  /* if (socket.notifications && socket.notifications.length > 0) {
    for (const notification of socket.notifications) {
      if (!notification.isRead) {
        // Save the notification to the database
        await Notification.create(notification);
        console.log(`Saved notification for ${notification.userId}: ${notification.message}`);
      }
    }
  } */
  console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
});

// Function to send push notifications
const sendPushNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log(`Notification sent to ${subscription.endpoint}`);
  } catch (error) {
    console.error("Error sending notification", error);
  }
};

// Controller to create and send a notification
exports.createAndSendNotification = async ({ userId, type, content, relatedChatId, relatedGroupId }) => {
  try {
    // Create notification in database
    const notification = await MessageNotification.create({
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
    const notification = await MessageNotification.findById(notificationId);
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
    const notifications = await MessageNotification.find({ userId, isRead: false });
    res.status(200).json(notifications);
  } catch (error) {
    console.error("Error fetching unread notifications:", error);
    res.status(500).json({ message: "Failed to fetch unread notifications" });
  }
};

// Controller to handle user subscription to push notifications
exports.subscribe = async (req, res) => {
  const subscription = req.body;
  try {
    // Save or update user subscription in the database
    const existingSubscription = await WebPushSubscription.findOneAndUpdate(
      { userId: req.user._id },
      { subscription },
      { upsert: true, new: true }
    );
    res.status(200).json({ message: "Subscription saved successfully" });
  } catch (error) {
    console.error("Error saving subscription:", error);
    res.status(500).json({ message: "Failed to save subscription" });
  }
};

// Helper Function (to be implemented)
function findSocketByUserId(userId) {
  // You can maintain a map of userId to socket IDs in your server
  // and find the active socket connection by user ID
  return [...io.sockets.sockets.values()].find(socket => socket.user && socket.user._id.toString() === userId);
}