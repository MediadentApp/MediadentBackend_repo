const Education = require("@src/models/userEducationDetailModel");
const { UserFormat } = require("@src/models/userFormatModel");
const { Chat } = require("@src/models/userMessages");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const { default: mongoose } = require("mongoose");

exports.userById = catchAsync(async (req, res, next) => {
  const { idArr } = req.body;
  if (!idArr) return next(new AppError('User IDs are required', 400));

  const users = await User.find({ _id: { $in: idArr } });
  if (!users) return next(new AppError('Error fetching users', 500));


  res.status(201).json({
    status: 'success',
    data: users
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

  if (!chatIds || !Array.isArray(chatIds) || chatIds.length === 0) {
    return next(new AppError('Chat IDs must be provided as a non-empty array', 400));
  }
  if (!userId) {
    return next(new AppError('User ID must be provided', 400));
  }

  const chats = await Chat.find({
    _id: { $in: chatIds },
    participants: userId, // ensures the user is part of the chat
  })
    .populate('participants', 'firstName lastName email username') // populate participants with user details
    .exec();

  // if (!chats || chats.length === 0) {
  //   return next(new AppError('No chats found for the provided chat IDs', 404));
  // }

  // Response array
  const result = chats.map(chat => {
    const secondUser = chat.participants.find(participant => participant._id.toString() !== userId);

    if (!secondUser) {
      throw new AppError('Chat does not contain a valid second participant', 400);
    }

    return {
      chatId: chat._id,
      secondParticipant: {
        _id: secondUser._id,
        firstName: secondUser.firstName,
        lastName: secondUser.lastName,
        email: secondUser.email,
      },
    };
  });

  res.status(200).json({
    status: 'success',
    data: result,
  });
});

exports.saveAcademicDetails = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  // !no need to fetch from database as it is already being fetched from protect
  const userDetails = await User.findById(userId);

  if (userDetails.education && mongoose.Types.ObjectId.isValid(userDetails.education)) {
    if (await Education.findById(userDetails.education))
      return next(new AppError('Academic Details already exists', 405));
  }

  const educationData = { ...req.body, user: userId };
  const education = await Education.create(educationData);

  res.status(201).json({
    status: 'success',
    data: education
  });
});

exports.updateAcademicDetails = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const userDetails = await User.findById(userId).populate('education');

  if (!userDetails.education) {
    return next(new AppError('Academic Details does not exist', 405));
  }

  const educationUpdatedData = req.body;
  Object.keys(educationUpdatedData).forEach(key => {
    if (userDetails.education[key] !== undefined) {
      userDetails.education[key] = educationUpdatedData[key];
    }
  });

  const educationDetails = await userDetails.education.save();
  res.status(200).json({
    status: 'success',
    data: educationDetails
  });
});

exports.getAcademicDetails = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
  const userDetails = await User.findById(userId).populate('education');

  if (!userDetails.education) {
    return next(new AppError('Academic Details does not exist', 405));
  }
  res.status(200).json({
    status: 'success',
    data: userDetails.education
  });
});
