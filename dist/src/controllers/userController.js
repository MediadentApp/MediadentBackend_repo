import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import catchAsync from '../utils/catchAsync.js';
import Notification from '../models/userNotificationModel.js';
import User from '../models/userModel.js';
import Education from '../models/userEducationDetailModel.js';
import { ErrorCodes } from '../config/constants/errorCodes.js';
import responseMessages from '../config/constants/responseMessages.js';
import ApiResponse, { ApiPaginatedResponse } from '../utils/ApiResponse.js';
import { DebouncedExecutor } from '../utils/DebouncedExecutor.js';
import { UserFollows } from '../models/userFollows.model.js';
import redisConnection from '../redis.js';
import Post from '../models/post.model.js';
import { computeHomeFeed } from '../recommendations/strategies/home.strategy.js';
import { FetchPaginatedData, FetchPaginatedDataWithAggregation } from '../utils/ApiPaginatedResponse.js';
import userServiceHandler from '../services/user.service.js';
import ImageUpload from '../libs/imageUpload.js';
import { deleteImagesFromS3 } from '../libs/s3.js';
import { flattenObj } from '../utils/dataManipulation.js';
import { fetchPostPipelineStage } from '../helper/fetchPostAggregationPipeline.js';
import { sendUserNotification } from '../services/sendSocketMessageOrNotification.js';
import { ApiAccessLog } from '../models/accessLogs.model.js';
/**
 * Get the user's profile
 *
 * Route: GET /
 */
export const fetchUser = catchAsync(async (req, res, next) => {
    const { user } = req;
    if (!user || !(user instanceof User)) {
        return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.LOGIN.USER_NOT_FOUND));
    }
    const data = { user };
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data, { authenticated: true });
});
/**
 * Update the user's profile
 *
 * Route: PATCH /
 */
export const updateUser = catchAsync(async (req, res, next) => {
    const { _id: userId, username, profilePicture: oldProfilePicture } = req.user;
    let updateData = flattenObj(req.body);
    const file = req.file;
    // const updateData = getUpdateObj(['description', 'type', 'moderators'], req.body);
    let imageUploadResp;
    if (file) {
        if (oldProfilePicture) {
            // a delete queue can be used
            void deleteImagesFromS3([oldProfilePicture]);
        }
        const filesData = [];
        const key = `${username}-avatar`;
        const fileData = {
            fileName: key,
            mimeType: file.mimetype,
            fileBase64: file.buffer.toString('base64'),
        };
        filesData.push(fileData);
        imageUploadResp = await ImageUpload({ files: filesData, username: req.user.username ?? 'auto' });
        updateData = {
            ...updateData,
            profilePicture: imageUploadResp?.uploaded.find(file => file.fileName === key)?.url,
        };
    }
    const user = await User.findOneAndUpdate({ _id: userId }, updateData, { new: true });
    if (!user) {
        return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));
    }
    const data = user;
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
/**
 * Update the user's profile avatar
 *
 * Route: PATCH /picture
 */
export const updateUserPicture = catchAsync(async (req, res, next) => {
    const { _id: userId, username, profilePicture: oldProfilePicture } = req.user;
    const { deletePicture } = req.body;
    const file = req.file;
    if (deletePicture && oldProfilePicture) {
        void deleteImagesFromS3([oldProfilePicture]);
    }
    if (!file) {
        return next();
        // Delete old avatar if it exists (asynchronously)
        // return next(new ApiError(responseMessages.CLIENT.IMAGE_NOT_PROVIDED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    if (oldProfilePicture) {
        void deleteImagesFromS3([oldProfilePicture]);
    }
    const key = `${username}-avatar`;
    const fileData = {
        fileName: key,
        mimeType: file.mimetype,
        fileBase64: file.buffer.toString('base64'),
    };
    const imageUploadResp = await ImageUpload({ files: [fileData], username: username ?? 'auto' });
    const avatarUrl = imageUploadResp?.uploaded.find(file => file.fileName === key)?.url;
    if (!avatarUrl) {
        return next(new ApiError(responseMessages.GENERAL.SERVER_ERROR, 500, ErrorCodes.SERVER.UNKNOWN_ERROR));
    }
    const updatedUser = await User.findByIdAndUpdate(userId, { profilePicture: avatarUrl }, { new: true });
    if (!updatedUser) {
        return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));
    }
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, {
        profilePicture: updatedUser.profilePicture,
    });
});
/**
 * Get user by identifier(username or id)
 *
 * Route: GET /user
 */
export const getUserByIdentifier = catchAsync(async (req, res, next) => {
    const { identifier } = req.params;
    const searchCriteria = {};
    if (mongoose.Types.ObjectId.isValid(identifier)) {
        searchCriteria['_id'] = identifier;
    }
    else {
        searchCriteria['username'] = identifier;
    }
    const user = await User.findOne(searchCriteria).lean();
    if (!user) {
        return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));
    }
    if (!req.user._id.equals(user._id)) {
        const clientFollowsUser = await UserFollows.exists({
            userId: req.user._id,
            followingUserId: user._id,
        });
        user['isFollowing'] = clientFollowsUser ? true : false;
    }
    const data = user;
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
/**
 * Get users by ids
 *
 * Route: POST /users
 */
export const userByIds = catchAsync(async (req, res, next) => {
    const { idArr } = req.body;
    if (!idArr || idArr.length === 0)
        return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    const users = await User.find({ _id: { $in: idArr } });
    if (users.length === 0) {
        return next(new ApiError(responseMessages.USER.USERS_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));
    }
    const data = users;
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
// Fetch user notifications
export const userNotifications = catchAsync(async (req, res) => {
    const userId = req.user._id;
    const notifications = await Notification.find({ userId }).sort({
        createdAt: -1,
    });
    const data = notifications;
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
// Save academic details
export const saveAcademicDetails = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
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
export const updateAcademicDetails = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const userDetails = await User.findById(userId).populate('education');
    if (!userDetails || !userDetails.education) {
        // Academic Details do not exist
        return next(new ApiError(responseMessages.GENERAL.METHOD_NOT_ALLOWED, 405, ErrorCodes.DATA.NOT_FOUND));
    }
    Object.assign(userDetails.education, req.body);
    const updatedEducation = await userDetails.education.save();
    const data = updatedEducation;
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
// Get academic details
export const getAcademicDetails = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const userDetails = await User.findById(userId).populate('education');
    if (!userDetails || !userDetails.education) {
        // Academic Details do not exist
        return next(new ApiError(responseMessages.GENERAL.METHOD_NOT_ALLOWED, 405, ErrorCodes.DATA.NOT_FOUND));
    }
    const data = userDetails.education;
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});
const followUserExecutor = new DebouncedExecutor();
/**
 * Controller to follow a user
 *
 * Route: PATCH /user/:id/follow/toggle
 */
export const followUserToggle = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const io = req.app.get('io');
    const { id: followUserId } = req.params;
    if (!followUserId || !mongoose.Types.ObjectId.isValid(followUserId) || userId.equals(followUserId)) {
        return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    const followUserExists = await User.exists({ _id: followUserId }).lean();
    if (!followUserExists) {
        return next(new ApiError(responseMessages.USER.USER_NOT_FOUND, 404, ErrorCodes.GENERAL.USER_NOT_FOUND));
    }
    const key = `${followUserId}-${req.user._id}`;
    followUserExecutor.addOperation({
        id: key,
        query: async () => {
            const userExists = await UserFollows.exists({ followingUserId: followUserId, userId }).lean();
            if (userExists) {
                userServiceHandler.add({
                    type: 'delete',
                    collectionName: 'followUserToggle',
                    id: key,
                    data: {
                        followingUserId: followUserId,
                        userId,
                    },
                });
            }
            else {
                userServiceHandler.add({
                    type: 'create',
                    collectionName: 'followUserToggle',
                    id: key,
                    data: {
                        followingUserId: followUserId,
                        userId,
                    },
                });
                const sender = req.user;
                const content = `${sender.username} started following you`;
                void sendUserNotification({
                    io,
                    recipientId: followUserId,
                    sender: sender,
                    type: 'follow',
                    content,
                });
            }
        },
    });
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
/**
 * Controller to get home feed
 *
 * Route: GET /user/home/feed
 */
export const getHomeFeed = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const redisKey = `home:feed:${userId}`;
    const fresh = !!req.query.fresh;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.pageSize) || 10;
    const start = (page - 1) * limit;
    const end = start + limit - 1;
    let postIds = await redisConnection.lrange(redisKey, start, end);
    // If Redis is empty, compute it once
    if (fresh || postIds.length === 0) {
        await computeHomeFeed(String(userId));
        postIds = await redisConnection.lrange(redisKey, start, end);
    }
    const posts = await FetchPaginatedDataWithAggregation(Post, [{ $match: { _id: { $in: postIds.map(id => new mongoose.Types.ObjectId(id)) } } }], {
        populateFields: [{ path: 'communityId', select: '_id slug name avatarUrl', from: 'communities' }],
    }, [...fetchPostPipelineStage(String(userId))]);
    return ApiPaginatedResponse(res, posts);
});
/**
 * Controller to get popular feed
 *
 * Route: GET /user/popular/feed
 */
export const getPopularFeed = catchAsync(async (req, res, next) => {
    const { _id: userId } = req.user;
    const posts = await FetchPaginatedDataWithAggregation(Post, [], {
        page: req.query.page ?? '1',
        pageSize: req.query.pageSize ?? '15',
        sortField: 'popularityScore',
        sortOrder: 'desc',
        populateFields: [{ path: 'communityId', select: '_id slug name avatarUrl', from: 'communities' }],
    }, [...fetchPostPipelineStage(String(userId))]);
    return ApiPaginatedResponse(res, posts);
});
export const getAccessLogs = catchAsync(async (req, res, next) => {
    const fetchedData = await FetchPaginatedData(ApiAccessLog, {
        page: req.query.page ?? '1',
        pageSize: req.query.pageSize ?? '10',
        sortField: 'createdAt',
        sortOrder: 'desc',
    });
    return ApiPaginatedResponse(res, fetchedData);
});
export const deleteAllAccessLogs = catchAsync(async (req, res, next) => {
    await ApiAccessLog.deleteMany({});
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
