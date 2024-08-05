const AcademicPrograms = require("@src/models/academicProgramsDetails");
const Education = require("@src/models/userEducationDetailModel");
const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const catchAsync = require("@src/utils/catchAsync");
const { findKeyValues } = require("@src/utils/util");
const { default: mongoose } = require("mongoose");

exports.allBoards = catchAsync(async (req, res, next) => {
  const boards = await AcademicPrograms.findOne({ boards: { $exists: true } });
  if (!boards) return next(new AppError(`Could not find board list`, 404));

  res.status(200).json({ data: boards.boards });
});

exports.allStreams = catchAsync(async (req, res, next) => {
  const streams = await AcademicPrograms.findOne({ streams: { $exists: true } });
  if (!streams) return next(new AppError(`Could not find streams list`, 404));

  res.status(200).json({ data: streams.streams });
});

exports.allGraduationCourses = catchAsync(async (req, res, next) => {
  const graduationCourses = await AcademicPrograms.findOne({ graduation: { $exists: true } });

  if (!graduationCourses) return next(new AppError(`Could not find graduation courses list`, 404));
  const courses = findKeyValues(graduationCourses.graduation, 'courses');

  res.status(200).json({ data: courses });
});

exports.allPostGraduationCourses = catchAsync(async (req, res, next) => {
  const postGraduationCourses = await AcademicPrograms.findOne({ postGraduation: { $exists: true } });

  if (!postGraduationCourses) return next(new AppError(`Could not find graduation courses list`, 404));
  const courses = findKeyValues(postGraduationCourses.postGraduation, 'courses');

  res.status(200).json({ data: courses });
});

exports.allProfessions = catchAsync(async (req, res, next) => {
  const professions = await AcademicPrograms.find({ professions: { $exists: true } });
  if (!professions) return next(new AppError(`Could not find professions list`, 404));

  res.status(200).json({ data: professions[0].professions });
});


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
