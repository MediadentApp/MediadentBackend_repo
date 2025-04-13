import { Request, Response, NextFunction } from 'express';
import mongoose, { Types } from 'mongoose';

import ApiError from '#src/utils/ApiError.js';
import catchAsync from '#src/utils/catchAsync.js';
import Notification from '#src/models/userNotificationModel.js';
import User from '#src/models/userModel.js';
import Education from '#src/models/userEducationDetailModel.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import ApiResponse from '#src/utils/ApiResponse.js';

// User by ID
export const userById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { idArr }: { idArr: string[] } = req.body;
  if (!idArr || idArr.length === 0)
    return next(
      new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
    );

  const users = await User.find({ _id: { $in: idArr } });
  if (users.length === 0)
    return next(new ApiError(responseMessages.USER.USERS_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));

  const data = users;
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});

// Fetch user notifications
export const userNotifications = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user._id as string;
  const notifications = await Notification.find({ userId }).sort({
    createdAt: -1,
  });

  const data = notifications;
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});

// Save academic details
export const saveAcademicDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id as string;

  const userDetails = await User.findById(userId);
  if (!userDetails)
    return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));

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

  const data = { education };
  return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, data);
});

// Update academic details
export const updateAcademicDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id as string;
  const userDetails = await User.findById(userId).populate<{
    education: any;
  }>('education');

  if (!userDetails || !userDetails.education) {
    // Academic Details do not exist
    return next(new ApiError(responseMessages.GENERAL.METHOD_NOT_ALLOWED, 405, ErrorCodes.GENERAL.NO_DATA_FOUND));
  }

  Object.assign(userDetails.education, req.body);
  const updatedEducation = await userDetails.education.save();

  const data = updatedEducation;
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});

// Get academic details
export const getAcademicDetails = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user._id as string;
  const userDetails = await User.findById(userId).populate<{
    education: any;
  }>('education');

  if (!userDetails || !userDetails.education) {
    // Academic Details do not exist
    return next(new ApiError(responseMessages.GENERAL.METHOD_NOT_ALLOWED, 405, ErrorCodes.GENERAL.NO_DATA_FOUND));
  }

  const data = userDetails.education;
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
