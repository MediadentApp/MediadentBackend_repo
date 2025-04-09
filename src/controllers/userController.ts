import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';

import ApiError from '#src/utils/appError.js';
import catchAsync from '#src/utils/catchAsync.js';
import Notification from '#src/models/userNotificationModel.js';
import User from '#src/models/userModel.js';
import Education from '#src/models/userEducationDetailModel.js';
import { ErrorCodes } from '#src/config/errorCodes.js';

// User by ID
export const userById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { idArr }: { idArr: string[] } = req.body;
  if (!idArr || idArr.length === 0)
    return next(new ApiError('User IDs are required', 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));

  const users = await User.find({ _id: { $in: idArr } });
  if (users.length === 0) return next(new ApiError('No users found', 404, ErrorCodes.GENERAL.USER_NOT_FOUND));

  res.status(200).json({
    status: 'success',
    data: users,
  });
});

// Fetch user notifications
export const userNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id as string;
  const notifications = await Notification.find({ userId }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    status: 'success',
    data: notifications,
  });
});

// Save academic details
export const saveAcademicDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id as string;

  const userDetails = await User.findById(userId);
  if (!userDetails) return next(new ApiError('User not found', 404, ErrorCodes.GENERAL.USER_NOT_FOUND));

  // if (
  //   userDetails.education &&
  //   Types.ObjectId.isValid(userDetails.education)
  // ) {
  //   const existingEducation = await Education.findById(userDetails.education);
  //   if (existingEducation)
  //     return next(new ApiError('Academic Details already exist', 405));
  // }

  const educationData = { ...req.body, user: userId };
  const education = await Education.create(educationData);

  res.status(201).json({
    status: 'success',
    data: education,
  });
});

// Update academic details
export const updateAcademicDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id as string;
  const userDetails = await User.findById(userId).populate<{
    education: any;
  }>('education');

  if (!userDetails || !userDetails.education) {
    return next(new ApiError('Academic Details do not exist', 405, ErrorCodes.GENERAL.NO_DATA_FOUND));
  }

  Object.assign(userDetails.education, req.body);
  const updatedEducation = await userDetails.education.save();

  res.status(200).json({
    status: 'success',
    data: updatedEducation,
  });
});

// Get academic details
export const getAcademicDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id as string;
  const userDetails = await User.findById(userId).populate<{
    education: any;
  }>('education');

  if (!userDetails || !userDetails.education) {
    return next(new ApiError('Academic Details do not exist', 405, ErrorCodes.GENERAL.NO_DATA_FOUND));
  }

  res.status(200).json({
    status: 'success',
    data: userDetails.education,
  });
});
