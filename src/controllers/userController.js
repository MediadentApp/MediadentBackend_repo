const Education = require("@src/models/userEducationDetailModel");
const { UserFormat } = require("@src/models/userFormatModel");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const { default: mongoose } = require("mongoose");

exports.saveAcademicDetails = catchAsync(async (req, res, next) => {
  const userId = req.user._id;
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