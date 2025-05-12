import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import ImageUpload, { ImageFileData } from '#src/libs/imageUpload.js';
import Community from '#src/models/communityModel.js';
import Post from '#src/models/postModel.js';
import { AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import { PostAuthorType } from '#src/types/enum.js';
import { SlugParam } from '#src/types/param.js';
import { ICommunityBody } from '#src/types/request.community.js';
import { PostBody } from '#src/types/request.post.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { NextFunction } from 'express';

export const createCommunity = catchAsync(
  async (req: AppRequestBody<ICommunityBody>, res: AppResponse, next: NextFunction) => {
    const { name, description, parentId, type, moderators } = req.body;
    const files = req.files as {
      avatar?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    };

    if (!name) {
      return next(
        new ApiError(responseMessages.APP.CUMMUNITY.NAME_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    if (parentId) {
      const parentCommunityExists = await Community.exists({ _id: parentId });
      if (!parentCommunityExists) {
        return next(
          new ApiError(responseMessages.APP.CUMMUNITY.PARENT_NOT_FOUND, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
        );
      }
    }

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
      // console.log('imageUploadCummunityResp', imageUploadResp);
    }

    const slug =
      name.replace(/\s+/g, '-').toLowerCase() + process.env.NODE_ENV !== 'production' ? `${Date.now()}-dev` : '';

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
  }
);

export const getCommunityBySlug = catchAsync(
  async (req: AppRequestParams<SlugParam>, res: AppResponse, next: NextFunction) => {
    const { slug } = req.params;

    const community = await Community.findOne({ slug }).lean();
    if (!community) {
      return next(new ApiError(responseMessages.APP.CUMMUNITY.NOT_FOUND, 404));
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, community);
  }
);

// !WIP
export const getAllPosts = catchAsync(async (req: AppRequestBody<PostBody>, res: AppResponse, next: NextFunction) => {
  const data = await Post.find().sort({ createdAt: -1 });
  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, data);
});

export const communityPosts = catchAsync(
  async (req: AppRequestBody<PostBody>, res: AppResponse, next: NextFunction) => {
    const { title, content = '', tags = [] } = req.body;

    if (!title) {
      return next(new ApiError(responseMessages.APP.POST.TITLE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
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
      title.replace(/\s+/g, '-').toLowerCase() + process.env.NODE_ENV !== 'production' ? `${Date.now()}-dev` : '';
    const authorType = PostAuthorType.Community;
    const author = req.user._id;

    const data = await Post.create({
      title,
      content,
      slug,
      postAuthorType: authorType,
      author,
      tags: allTags,
      mediaUrls: imageUploadResp?.uploaded.map(({ url }) => url),
    });

    ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, data);
  }
);
