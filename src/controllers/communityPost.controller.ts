import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import ImageUpload, { ImageFileData } from '#src/libs/imageUpload.js';
import Community from '#src/models/communityModel.js';
import Post from '#src/models/postModel.js';
import { AppRequest, AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { PostAuthorType } from '#src/types/enum.js';
import { ICommunity } from '#src/types/model.community.js';
import { IPost } from '#src/types/model.post.js';
import { CommunityPostParam } from '#src/types/param.communityPost.js';
import { IdParam, SlugParam } from '#src/types/param.js';
import { QueryParam } from '#src/types/query.js';
import { ICommunityBody } from '#src/types/request.community.js';
import { PostBody } from '#src/types/request.post.js';
import ApiError from '#src/utils/ApiError.js';
import { FetchPaginatedData } from '#src/utils/ApiPaginatedResponse.js';
import ApiResponse, { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction } from 'express';
import { ObjectId } from 'mongoose';

/**
 * Controller to create a new community.
 *
 * Request Body:
 * - name: string
 * - description: string
 * - parentId: ObjectId (optional)
 * - type: CommunityType (optional)
 * - moderators: ObjectId[] (optional)
 * - avatar?: Express.Multer.File[]
 * - banner?: Express.Multer.File[]
 *
 * Note: The avatar and banner fields are optional, but if provided, they will be uploaded to the cloud storage and the
 *       corresponding URLs will be stored in the database. The field names must match the ones specified in the
 *       `appConfig.app.post.allowedCommunityImageType` array.
 *
 * Route: POST /community
 */
export const createCommunity = catchAsync(async (req, res, next) => {
  const { name, description, parentId, type, moderators } = req.body;
  const files = req.files as {
    avatar?: Express.Multer.File[];
    banner?: Express.Multer.File[];
  };

  alert('hi');

  if (!name) {
    return next(
      new ApiError(responseMessages.APP.COMMUNITY.NAME_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
    );
  }

  // 🛑 Check for duplicate name (case-sensitive)
  const existingCommunity = await Community.findOne({ name }).lean();
  if (existingCommunity) {
    return next(new ApiError(responseMessages.APP.COMMUNITY.ALREADY_EXISTS, 400, ErrorCodes.DATA.ALREADY_EXISTS));
  }

  // ✅ Check if parent exists (if provided)
  if (parentId) {
    const parentCommunityExists = await Community.exists({ _id: parentId }).lean();
    if (!parentCommunityExists) {
      return next(
        new ApiError(responseMessages.APP.COMMUNITY.PARENT_NOT_FOUND, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }
  }

  // 🖼️ Upload images only after validation
  let imageUploadResp;
  if (files) {
    const filesData: ImageFileData[] = [];
    Object.entries(files).forEach(([key, value]) => {
      value.forEach(file => {
        filesData.push({
          fileName: file.fieldname ?? file.originalname,
          mimeType: file.mimetype,
          fileBase64: file.buffer.toString('base64'),
        });
      });
    });

    imageUploadResp = await ImageUpload({ files: filesData, username: req.user.username ?? 'auto' });
  }

  const slug = name.replace(/\s+/g, '-');

  const data = await Community.create({
    name,
    description,
    parentId,
    type,
    slug,
    moderators,
    owner: req.user._id,
    avatarUrl: imageUploadResp?.uploaded.find(file => file.fileName === 'avatar')?.url,
    bannerUrl: imageUploadResp?.uploaded.find(file => file.fileName === 'banner')?.url,
  });

  return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, data);
});

/**
 * Update a community by its ID (slug).
 *
 * Route: PATCH /community/:id
 */
export const updateCommunity = catchAsync(
  async (req: AppRequest<IdParam, ICommunityBody>, res: AppResponse, next: NextFunction) => {
    const { id } = req.params;
    const updateData = req.body;

    const community = await Community.findByIdAndUpdate(id, updateData, { new: true });
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, community);
  }
);

/**
 * Controller to retrieve a single community by slug.
 *
 * Route: GET /community/:slug
 */
export const getCommunityBySlug = catchAsync(
  async (req: AppRequestParams<SlugParam>, res: AppResponse, next: NextFunction) => {
    const { slug } = req.params;

    if (!slug) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const community = await Community.findOne({ slug }).lean();

    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, community);
  }
);

/**
 * Controller to fetch a paginated list of communities with optional search.
 *
 * Route: GET /community?search=xyz&page=1&limit=10
 */
export const getCommunities = catchAsync(async (req: AppPaginatedRequest, res: AppPaginatedResponse) => {
  const fetchedData = await FetchPaginatedData<ICommunity>(Community, {
    ...req.query,
    searchFields: req.query.searchFields ?? ['name'],
  });

  return ApiPaginatedResponse(res, fetchedData);
});

export const getAllCommunitypost = catchAsync(
  async (req: AppPaginatedRequest<CommunityPostParam>, res: AppPaginatedResponse, next: NextFunction) => {
    const { communityId } = req.params;

    const fetchedData = await FetchPaginatedData<IPost>(Post, {
      ...req.query,
      searchFields: req.query.searchFields ?? ['name'],
      _id: communityId,
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

export const getCommunityPost = catchAsync(
  async (req: AppRequestParams<CommunityPostParam, QueryParam>, res: AppResponse, next: NextFunction) => {
    const { communityId, postId } = req.params;
    const { searchByUserId } = req.query;

    const searchCriteria = {
      communityId,
      _id: postId,
    };

    const posts = await Post.findOne(searchCriteria).lean();

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, posts);
  }
);

// !WIP
export const getAllPosts = catchAsync(async (req: AppRequestBody<PostBody>, res: AppResponse, next: NextFunction) => {
  const data = await Post.find().sort({ createdAt: -1 });
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});

export const communityPosts = catchAsync(
  async (req: AppRequestBody<PostBody, IdParam>, res: AppResponse, next: NextFunction) => {
    const { title, content = '', tags = [] } = req.body;
    const { id: communityId } = req.params;

    if (!title) {
      return next(new ApiError(responseMessages.APP.POST.TITLE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    if (!communityId) {
      return next(
        new ApiError(responseMessages.APP.COMMUNITY.INVALID_ID, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const community = await Community.exists({ id: communityId }).lean();
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    const files = req.files as Array<Express.Multer.File>;

    let imageUploadResp;
    if (files && files.length) {
      const filesData: ImageFileData[] = files.map(file => ({
        fileName: file.fieldname ?? file.originalname,
        mimeType: file.mimetype,
        fileBase64: file.buffer.toString('base64'),
      }));

      imageUploadResp = await ImageUpload({ files: filesData, username: req.user.username ?? 'auto' });
      // console.log('imageUploadResp', imageUploadResp);
    }

    const allTags = [...tags, '#' + req.user.fullName];
    const slug =
      title.replace(/\s+/g, '-').toLowerCase() + (process.env.NODE_ENV !== 'production' ? `-${Date.now()}-dev` : '');
    const authorId = req.user._id;

    const postData = {
      title,
      content,
      slug,
      authorId,
      communityId: community._id as ObjectId,
      tags: allTags,
      mediaUrls: imageUploadResp?.uploaded.map(({ url }) => url),
    };
    const data = await Post.create(postData);

    ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, data);
  }
);
