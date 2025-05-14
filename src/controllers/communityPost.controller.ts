import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import ImageUpload, { ImageFileData } from '#src/libs/imageUpload.js';
import Community, { CommunityInvite } from '#src/models/communityModel.js';
import Post from '#src/models/postModel.js';
import { AppRequest, AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
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
import { getUpdateObj } from '#src/utils/dataManipulation.js';
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

  if (!name) {
    return next(
      new ApiError(responseMessages.APP.COMMUNITY.NAME_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
    );
  }

  // No need, as mongodb will throw an error
  // 🛑 Check for duplicate name (case-sensitive)
  // const existingCommunity = await Community.findOne({ name }).lean();
  // if (existingCommunity) {
  //   return next(new ApiError(responseMessages.APP.COMMUNITY.ALREADY_EXISTS, 400, ErrorCodes.DATA.ALREADY_EXISTS));
  // }

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
    const updateData = getUpdateObj(['description', 'type', 'moderators'], req.body);

    const community = await Community.findByIdAndUpdate(id, updateData, { new: true });
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, community);
  }
);

/**
 * Controller to delete a community by ID.
 *
 * Route: DELETE /communitypost/:communityId/
 */
export const deleteCommunity = catchAsync(
  async (req: AppRequestParams<IdParam>, res: AppResponse, next: NextFunction) => {
    const { id } = req.params;

    // const community = await Community.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    const community = await Community.findByIdAndDelete(id);

    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
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

    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }

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
    sortField: req.query.sortField ?? '-createdAt',
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
      communityId,
    });

    return ApiPaginatedResponse(res, fetchedData);
  }
);

/**
 * Controller to retrieve a single community post by ID.
 *
 * Route: GET /communitypost/:communityId/:postId
 */
export const getCommunityPost = catchAsync(
  async (req: AppRequestParams<CommunityPostParam, QueryParam>, res: AppResponse, next: NextFunction) => {
    const { communityId, postId } = req.params;
    const { searchByUserId } = req.query;

    const community = await Community.exists({ _id: communityId }).lean();
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    const searchCriteria = {
      communityId,
      _id: postId,
    };

    const posts = await Post.findOne(searchCriteria).lean();

    if (!posts) {
      return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, posts);
  }
);

/**
 * Controller to create a new community post.
 *
 * Route: POST /communitypost
 */
export const communityPosts = catchAsync(
  async (req: AppRequestBody<PostBody, CommunityPostParam>, res: AppResponse, next: NextFunction) => {
    const { title, content = '', tags = [] } = req.body;
    const { communityId } = req.params;
    const files = req.files as Array<Express.Multer.File>;

    if (!title) {
      return next(new ApiError(responseMessages.APP.POST.TITLE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    if (!communityId) {
      return next(
        new ApiError(responseMessages.APP.COMMUNITY.INVALID_ID, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const community = await Community.exists({ _id: communityId }).lean();
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    let imageUploadResp;
    if (files && files.length) {
      const filesData: ImageFileData[] = files.map(file => ({
        fileName:
          `${file.originalname ? `${file.originalname.split('.')[0]}-` : ''}` + `${req.user.username}-` + 'post',
        mimeType: file.mimetype,
        fileBase64: file.buffer.toString('base64'),
      }));

      imageUploadResp = await ImageUpload({ files: filesData, username: req.user.username ?? 'auto' });
    }

    const allTags = [...tags, '#' + req.user.fullName];
    const slug = title.replace(/\s+/g, '-').toLowerCase() + `-${Date.now()}`;
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

/**
 * Controller to delete a community post by ID.
 *
 * Route: DELETE /communitypost/:communityId/:postId
 */
export const deleteCommunityPost = catchAsync(
  async (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => {
    const { communityId, postId } = req.params;

    // const post = await Community.findByIdAndUpdate({ communityId, _id: postId }, { isDeleted: true }, { new: true });
    const post = await Post.findByIdAndDelete({ communityId, _id: postId });

    if (!post) {
      return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
  }
);

export const updateCommunityPost = catchAsync(
  async (req: AppRequestBody<PostBody, CommunityPostParam>, res: AppResponse, next: NextFunction) => {
    const { communityId, postId } = req.params;
    const files = req.files as Array<Express.Multer.File>;

    const post = await Post.findOneAndUpdate(
      { communityId, _id: postId },
      { $set: getUpdateObj(['title', 'content', 'tags'], req.body) },
      { new: true, upsert: false }
    );

    if (!post) {
      return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    if (files && files.length) {
      const filesData: ImageFileData[] = files.map(file => ({
        fileName:
          `${file.originalname ? `${file.originalname.split('.')[0]}-` : ''}` + `${req.user.username}-` + 'post',
        mimeType: file.mimetype,
        fileBase64: file.buffer.toString('base64'),
      }));

      const imageUploadResp = await ImageUpload({
        files: filesData,
        username: req.user.username ?? 'auto',
      });
      post.mediaUrls = imageUploadResp.uploaded.map(({ url }) => url);
      await post.save(); // Save the post after updating mediaUrls
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, post);
  }
);

// WIP
export const inviteToCommunity = catchAsync(async (req: AppRequestBody, res: AppResponse, next: NextFunction) => {
  const { communityId, email, role } = req.body;

  const invite = await CommunityInvite.create({
    communityId,
    email,
    invitedBy: req.user._id,
    role,
    status: 'Pending',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
  });

  ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, invite);
});
