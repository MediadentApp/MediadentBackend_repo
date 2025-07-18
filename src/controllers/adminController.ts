import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import { ApiAccessLog } from '#src/models/accessLogs.model.js';
import { BannedIP } from '#src/models/BannedIP.model.js';
import Community from '#src/models/community.model.js';
import Post from '#src/models/post.model.js';
import User from '#src/models/userModel.js';
import redisConnection from '#src/redis.js';
import { AppRequest } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { IdParam } from '#src/types/param.js';
import ApiError from '#src/utils/ApiError.js';
import { FetchPaginatedData } from '#src/utils/ApiPaginatedResponse.js';
import ApiResponse, { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction, Request, Response } from 'express';

/**
 * Controller to fetch a paginated list of api access logs.
 *
 * Route: GET /admin/accesslogs
 */
export const getAccessLogs = catchAsync(
  async (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(ApiAccessLog, {
      page: req.query.page ?? '1',
      pageSize: req.query.pageSize ?? '10',
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

/**
 * Controller to delete all api access logs.
 *
 * Route: DELETE /admin/accesslogs/:id
 */
export const deleteAllAccessLogs = catchAsync(
  async (req: AppRequest<IdParam>, res: AppResponse, next: NextFunction) => {
    const { id } = req.params;

    await ApiAccessLog.deleteMany({ _id: id ? id : { $exists: true } });
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
  }
);

/**
 * Controller to fetch a paginated list of users.
 *
 * Route: GET /admin/users
 */
export const getAllUsers = catchAsync(
  async (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(User, {
      page: req.query.page ?? '1',
      pageSize: req.query.pageSize ?? '10',
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

/**
 * Controller to delete a user.
 *
 * Route: DELETE /admin/users/:id
 */
export const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    return ApiResponse(res, 404, responseMessages.GENERAL.NOT_FOUND, { id });
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

/**
 * Controller to fetch a paginated list of communities.
 *
 * Route: GET /admin/communities
 */
export const getAllCommunities = catchAsync(
  async (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(Community, {
      page: req.query.page ?? '1',
      pageSize: req.query.pageSize ?? '10',
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

/**
 * Controller to delete a community.
 *
 * Route: DELETE /admin/communities/:id
 */
export const deleteCommunity = catchAsync(async (req, res) => {
  const { id } = req.params;

  const community = await Community.findByIdAndDelete(id);

  if (!community) {
    return ApiResponse(res, 404, responseMessages.GENERAL.NOT_FOUND, { id });
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

/**
 * Controller to fetch a paginated list of posts.
 *
 * Route: GET /admin/posts
 */
export const getAllPosts = catchAsync(
  async (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(Post, {
      page: req.query.page ?? '1',
      pageSize: req.query.pageSize ?? '10',
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

/**
 * Controller to delete a post.
 *
 * Route: DELETE /admin/posts/:id
 */
export const deletePost = catchAsync(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findByIdAndDelete(id);

  if (!post) {
    return ApiResponse(res, 404, responseMessages.GENERAL.NOT_FOUND, { id });
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

/**
 * Controller to get a paginated list of banned IP addresses.
 *
 * Route: GET /admin/banned-ips
 */
export const getBannedIPs = catchAsync(
  async (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) => {
    const fetchedData = await FetchPaginatedData(BannedIP, {
      page: req.query.page ?? '1',
      pageSize: req.query.pageSize ?? '10',
      sortField: 'createdAt',
      sortOrder: 'desc',
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

/**
 * Controller to ban an IP address.
 *
 * Route: POST /admin/ban-ip
 */
export const banIP = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const { ip, reason, banNetwork = false } = req.body;

  if (!ip) {
    return next(
      new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
    );
  }

  const existing = await BannedIP.findOne({ ip });
  if (existing) {
    return next(new ApiError(responseMessages.GENERAL.CONFLICT, 400, ErrorCodes.GENERAL.FAIL));
  }

  await BannedIP.create({ ip, reason: reason || '', banNetwork });

  if (banNetwork) {
    const subnet = ip.split('.').slice(0, 3).join('.');
    await redisConnection.sadd('banned_subnets', subnet);
  } else {
    await redisConnection.sadd('banned_ips', ip);
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

/**
 * Controller to unban an IP address.
 *
 * Route: DELETE /admin/unban-ip/id
 */
export const unbanIP = catchAsync(async (req: AppRequest<IdParam>, res: Response, next: NextFunction) => {
  const { id } = req.params;

  if (!id) {
    return next(
      new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
    );
  }

  const bannedEntry = await BannedIP.findById(id);
  if (!bannedEntry) {
    return next(new ApiError(responseMessages.DATA.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
  }

  // Remove from Redis
  if (bannedEntry.banNetwork) {
    const subnet = bannedEntry.ip.split('.').slice(0, 3).join('.');
    await redisConnection.srem('banned_subnets', subnet);
  } else {
    await redisConnection.srem('banned_ips', bannedEntry.ip);
  }

  // Remove from MongoDB
  await bannedEntry.deleteOne();

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
