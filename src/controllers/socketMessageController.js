const userSockets = require("@src/helper/socketMap");
const { Chat, GroupChat, Message, WebPushSubscription } = require("@src/models/userMessages");
const User = require("@src/models/userModel");
const Notification = require("@src/models/userNotificationModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const catchSocket = require("@src/utils/catchSocket");
const { stringToObjectID } = require("@src/utils/util");
const { default: mongoose } = require("mongoose");
const webPush = require("web-push");

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
        type: 'newChat',
        content: `${firstName} sent you a message.`,
        isRead: false,
        isPushSent: false
      });

      const recipientData = findSocketByUserId(userBId);
      if (recipientData?.socketId) {
        io.to(recipientData.socketId).emit('newChatNotification', {
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

exports.readNotification = catchSocket(async (io, socket) => { });

exports.handleSendMessage = catchSocket(async (io, socket, messageData) => {
  const { chatId, content, recipientId } = messageData;

  if (!chatId || !content || !recipientId) {
    console.log('error ran');
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

  try {
    // Emit the message to the relevant chat room after saving
    io.to(chatId).emit('receiveMessage', {
      senderId: socket.user._id,
      senderUsername: socket.user.username,
      content,
      timestamp: new Date(),
      status: message.status
    });
    console.log("Message emitted to chat room:", chatId);
  } catch (error) {
    console.error("Error emitting receiveMessage:", error);
    return; // Stop further execution if there's an error
  }

  // Prepare the notification details
  const notification = {
    userId: recipientId,
    type: 'message',
    relatedChatId: chatId,
    content,
    isRead: false
  };

  console.log('recipientId: ', recipientId);
  // Find the recipient's socket
  const recipientData = findSocketByUserId(recipientId);
  console.log('Recipient socket: ', recipientData);

  if (recipientData) {
    // Check if the recipient is in the chat room
    const isInChatRoom = recipientData.rooms.has(chatId); // Check if recipient is in chat room

    if (isInChatRoom) {
      // User is in the chat room, message has already been emitted
      console.log(`Recipient ${recipientId} is in chat room ${chatId}, message emitted.`);
    } else {
      console.log('Sending new message notification to recipient');
      // User is connected but not in the chat room, send a direct notification
      io.to(recipientData.socketId).emit('newMessageNotification', {
        notificationId: null,
        content: notification.content,
        senderId: socket.user._id,
        timestamp: new Date(),
      });
    }
  } else {
    // User is offline, save the notification to the database
    await Notification.create(notification);
    console.log(`Saved notification for ${recipientId}: ${notification.content}`);
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
  userSockets.delete(socket.user._id);
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

