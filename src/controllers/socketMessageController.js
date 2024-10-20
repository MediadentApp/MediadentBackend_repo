const { Chat, GroupChat, Message } = require("@src/models/userMessages");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const catchSocket = require("@src/utils/catchSocket");

exports.chatID = catchAsync(async (req, res, next) => {
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
  const { chatId, content } = messageData;

  if (!chatId || !content) {
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
});

exports.handleDisconnect = (socket) => {
  console.log(`User ${socket.user.username} (${socket.id}) disconnected`);
};
