import responseMessages from '#src/config/constants/responseMessages.js';
import { ApiAccessLog } from '#src/models/accessLogs.model.js';
import Community from '#src/models/community.model.js';
import Post from '#src/models/post.model.js';
import User from '#src/models/userModel.js';
import { AppRequest } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { FetchPaginatedData } from '#src/utils/ApiPaginatedResponse.js';
import ApiResponse, { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction } from 'express';

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

export const deleteAllAccessLogs = catchAsync(async (req: AppRequest, res: AppResponse, next: NextFunction) => {
  await ApiAccessLog.deleteMany({});
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

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

export const deleteUser = catchAsync(async (req, res) => {
  const { id } = req.params;

  const user = await User.findByIdAndDelete(id);

  if (!user) {
    return ApiResponse(res, 404, responseMessages.GENERAL.NOT_FOUND, { id });
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

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

export const deleteCommunity = catchAsync(async (req, res) => {
  const { id } = req.params;

  const community = await Community.findByIdAndDelete(id);

  if (!community) {
    return ApiResponse(res, 404, responseMessages.GENERAL.NOT_FOUND, { id });
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});

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

export const deletePost = catchAsync(async (req, res) => {
  const { id } = req.params;

  const post = await Post.findByIdAndDelete(id);

  if (!post) {
    return ApiResponse(res, 404, responseMessages.GENERAL.NOT_FOUND, { id });
  }

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
