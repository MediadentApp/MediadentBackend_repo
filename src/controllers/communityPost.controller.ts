import appConfig from '#src/config/appConfig.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import ImageUpload, { ImageFileData } from '#src/libs/imageUpload.js';
import { deleteImagesFromS3 } from '#src/libs/s3.js';
import Community, { CommunityInvite } from '#src/models/community.model.js';
import { CommunityFollowedBy } from '#src/models/communityFollowedBy.model.js';
import Post from '#src/models/post.model.js';
import { PostSave } from '#src/models/postSave.model.js';
import { PostVote } from '#src/models/postVote.model.js';
import followCommunityServiceHandler from '#src/services/communityFollow.service.js';
import postSaveServiceHandler from '#src/services/postSave.service.js';
import postViewServiceHandler from '#src/services/postView.service.js';
import { AppRequest, AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { VoteEnum } from '#src/types/enum.js';
import { ICommunity } from '#src/types/model.community.js';
import { IPost } from '#src/types/model.post.type.js';
import { CommunityPostParam } from '#src/types/param.communityPost.js';
import { IdParam, SlugParam } from '#src/types/param.js';
import { QueryParam } from '#src/types/query.js';
import { ICommunityBodyDTO } from '#src/types/request.community.js';
import { PostBody } from '#src/types/request.post.js';
import ApiError from '#src/utils/ApiError.js';
import { FetchPaginatedData, FetchPaginatedDataWithAggregation } from '#src/utils/ApiPaginatedResponse.js';
import ApiResponse, { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { getUpdateObj } from '#src/utils/dataManipulation.js';
import { DebouncedExecutor } from '#src/utils/DebouncedExecutor.js';
import { NextFunction } from 'express';
import mongoose, { ObjectId } from 'mongoose';

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
export const createCommunity = catchAsync(
  async (req: AppRequest<IdParam, ICommunityBodyDTO>, res: AppResponse, next: NextFunction) => {
    const { name, description, type, moderators } = req.body;
    const { id: parentId } = req.params;
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
  }
);

/**
 * Update a community by its ID (slug).
 *
 * Route: PATCH /community/:id
 */
export const updateCommunity = catchAsync(
  async (req: AppRequest<IdParam, ICommunityBodyDTO>, res: AppResponse, next: NextFunction) => {
    const { id } = req.params;
    const files = req.files as {
      avatar?: Express.Multer.File[];
      banner?: Express.Multer.File[];
    };

    const updateData = getUpdateObj(['description', 'type', 'moderators'], req.body);

    const community = await Community.findById(id);
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }

    const { avatarUrl: oldAvatarUrl, bannerUrl: oldBannerUrl } = community;

    let imageUploadResp;
    if (files) {
      const deleteImages: string[] = [];
      if (files.avatar?.length) deleteImages.push(oldAvatarUrl);
      if (files.banner?.length) deleteImages.push(oldBannerUrl);

      if (deleteImages.length) {
        void deleteImagesFromS3(deleteImages); // non-blocking
      }

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

    if (imageUploadResp) {
      if (imageUploadResp?.uploaded.length) {
        for (const file of imageUploadResp.uploaded) {
          if (file.fileName === 'avatar') updateData.avatarUrl = file.url;
          if (file.fileName === 'banner') updateData.bannerUrl = file.url;
        }
      }
    }

    Object.assign(community, updateData);
    await community.save();

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

const followCommunityExecutor = new DebouncedExecutor();
/**
 * Controller to follow/unfollow a community.
 *
 * Route: POST /community/:id/follow/toggle
 */
export const toggleFollowCommunity = catchAsync(
  async (req: AppRequestParams<IdParam>, res: AppResponse, next: NextFunction) => {
    const { id: communityId } = req.params;
    const userId = req.user._id;

    if (!communityId || !mongoose.Types.ObjectId.isValid(communityId)) {
      return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400));
    }

    const community = await Community.exists({ _id: communityId }).lean();
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }

    const followCommunityId = `${communityId}-${userId}`;

    followCommunityExecutor.addOperation({
      id: followCommunityId,
      query: async () => {
        const follows = await CommunityFollowedBy.exists({ communityId, userId }).lean();
        if (follows) {
          followCommunityServiceHandler.add({
            type: 'delete',
            collectionName: 'CommunityFollowedBy',
            id: followCommunityId,
            data: { communityId, userId },
          });
        } else {
          followCommunityServiceHandler.add({
            type: 'create',
            collectionName: 'CommunityFollowedBy',
            id: followCommunityId,
            data: { communityId, userId },
          });
        }
      },
    });

    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
  }
);

/**
 * Controller to fetch a paginated list of community posts.
 *
 * Route: GET /communitypost/:communityId
 */
export const getAllCommunitypost = catchAsync(
  async (req: AppPaginatedRequest<CommunityPostParam>, res: AppPaginatedResponse, next: NextFunction) => {
    const { communityId } = req.params;
    const userId = req.user._id;

    const fetchedData = await FetchPaginatedDataWithAggregation<IPost>(
      Post,
      [
        { $match: { communityId: new mongoose.Types.ObjectId(communityId) } },

        {
          $lookup: {
            from: 'postsaves', // collection name (lowercase & plural of model)
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$postId', '$$postId'] }, { $eq: ['$userId', userId] }],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'savedByUser',
          },
        },
        {
          $lookup: {
            from: 'postviews',
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$postId', '$$postId'] }, { $eq: ['$userId', userId] }],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'viewedByUser',
          },
        },
        {
          $lookup: {
            from: 'postvotes',
            let: { postId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [{ $eq: ['$postId', '$$postId'] }, { $eq: ['$userId', userId] }],
                  },
                },
              },
              { $limit: 1 },
            ],
            as: 'votedByUser',
          },
        },
        {
          $addFields: {
            isSaved: { $gt: [{ $size: '$savedByUser' }, 0] },
            netVotes: { $subtract: ['$upvotesCount', '$downvotesCount'] },
            isViewed: { $gt: [{ $size: '$viewedByUser' }, 0] },
            voteType: {
              $cond: [{ $gt: [{ $size: '$votedByUser' }, 0] }, { $arrayElemAt: ['$votedByUser.voteType', 0] }, null],
            },
          },
        },
        {
          $project: {
            savedByUser: 0, // remove the raw join result
            viewedByUser: 0,
            votedByUser: 0,
          },
        },
      ],
      {
        ...req.query,
        searchFields: req.query.searchFields ?? ['title', 'content'],
      }
    );

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
    const { _id: userId } = req.user;

    const community = await Community.exists({ _id: communityId }).lean();
    if (!community) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    const searchCriteria = {
      communityId,
      _id: postId,
    };

    const post = await Post.findOne(searchCriteria).lean({ virtuals: true });

    if (!post) {
      return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    if (post) {
      const saved = await PostSave.exists({
        postId: post._id,
        userId: userId,
      });

      post.isSaved = !!saved; // add field dynamically
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, post);
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
    const user = req.user!;

    // 1. Post limit check
    if (user.postsCount >= appConfig.app.post.allowedPostsPerUser) {
      return next(new ApiError(responseMessages.APP.POST.POST_LIMIT_EXCEEDED, 400, ErrorCodes.APP.POST.LIMIT_EXCEEDED));
    }

    // 2. Validate required inputs
    if (!title?.trim()) {
      return next(new ApiError(responseMessages.APP.POST.TITLE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    if (!communityId?.trim()) {
      return next(
        new ApiError(responseMessages.APP.COMMUNITY.INVALID_ID, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    // 3. Validate community existence
    const communityExists = await Community.exists({ _id: communityId }).lean();
    if (!communityExists) {
      return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }

    // 4. Process file uploads if any
    let mediaUrls: string[] = [];
    if (files?.length) {
      const filesData: ImageFileData[] = files.map(file => ({
        fileName: `${file.originalname?.split('.')[0] || 'image'}-${user.username}-post`,
        mimeType: file.mimetype,
        fileBase64: file.buffer.toString('base64'),
      }));

      const uploadResult = await ImageUpload({ files: filesData, username: user.username ?? 'auto' });
      mediaUrls = uploadResult?.uploaded?.map(f => f.url) ?? [];
    }

    // 5. Construct post data
    const allTags = Array.from(new Set([...tags, `#${user.fullName}`]));
    const slug = `${title.trim().replace(/\s+/g, '-').toLowerCase()}-${Date.now()}`;

    const postData = {
      title: title.trim(),
      content: content.trim(),
      slug,
      authorId: user._id,
      communityId,
      tags: allTags,
      mediaUrls,
    };

    // 6. Create post
    const createdPost = await Post.create(postData);

    // 7. Respond
    ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, createdPost);
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

/**
 * Controller to update a community post by ID.
 *
 * Route: PATCH /communitypost/:communityId/:postId
 */
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
      post.mediaUrls = imageUploadResp?.uploaded.map(({ url }) => url);
      await post.save(); // Save the post after updating mediaUrls
    }

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, post);
  }
);

const votePostExecutor = new DebouncedExecutor(5000, 100);
/**
 * Controller to vote on a community post by ID.
 *
 * Route: POST /communitypost/:communityId/:postId/vote/:voteType
 */
export const votePost = catchAsync(
  async (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => {
    const { communityId, postId } = req.params;
    const { voteType } = req.params;
    const userId = req.user._id;
    const voteId = `${userId}-${postId}`;

    if (!Object.values(VoteEnum).includes(voteType)) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const post = await Post.exists({ _id: postId }).lean();
    if (!post) {
      return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    const existingVote = await PostVote.findOne({ postId, userId });

    votePostExecutor.addOperation({
      id: voteId,
      query: async () => {
        let voteOp: Promise<any>;
        let updateOp: Promise<any>;

        if (!existingVote) {
          // New vote
          voteOp = PostVote.create({ postId, userId, voteType });
          updateOp = Post.updateOne(
            { _id: postId },
            { $inc: voteType === VoteEnum.upVote ? { upvotesCount: 1 } : { downvotesCount: 1 } }
          );
        } else if (existingVote.voteType === voteType) {
          // Toggle vote off
          voteOp = PostVote.deleteOne({ _id: existingVote._id });
          updateOp = Post.updateOne(
            { _id: postId },
            { $inc: voteType === VoteEnum.upVote ? { upvotesCount: -1 } : { downvotesCount: -1 } }
          );
        } else {
          // Switch vote
          voteOp = PostVote.updateOne({ _id: existingVote._id }, { voteType });
          updateOp = Post.updateOne(
            { _id: postId },
            voteType === VoteEnum.upVote
              ? { $inc: { upvotesCount: 1, downvotesCount: -1 } }
              : { $inc: { downvotesCount: 1, upvotesCount: -1 } }
          );
        }

        // Execute in parallel without blocking
        // await
        Promise.all([voteOp, updateOp]);
      },
    });

    // Optionally return fresh counts if needed (only if needed on frontend)
    // const updated = await Post.findById(postId).select('upvotesCount downvotesCount');

    return ApiResponse(
      res,
      200,
      responseMessages.GENERAL.SUCCESS
      // , {
      // upvotesCount: updated?.upvotesCount || 0,
      // downvotesCount: updated?.downvotesCount || 0,
      // }
    );
  }
);

/**
 * Controller to track a community post view by ID.
 *
 * Route: POST /communitypost/:communityId/:postId/view
 */
export const trackPostView = catchAsync(
  async (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => {
    const { postId } = req.params;
    const { _id: userId } = req.user;

    postViewServiceHandler.add({
      type: 'create',
      collectionName: 'PostView',
      id: `${userId}-${postId}`,
      data: { postId, userId },
    });

    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
  }
);

const savePostExecutor = new DebouncedExecutor();
/**
 * Controller to save a community post by ID.
 *
 * Route: POST /communitypost/:communityId/:postId/save
 */
export const savePost = catchAsync(
  async (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => {
    const { postId } = req.params;
    const { _id: userId } = req.user;

    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const post = await Post.exists({ _id: postId }).lean();
    if (!post) {
      return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    const savePostId = `${userId}-${postId}`;

    savePostExecutor.addOperation({
      id: savePostId,
      query: async () => {
        const savedPost = await PostSave.exists({ postId, userId }).lean();
        if (savedPost) {
          postSaveServiceHandler.add({
            type: 'delete',
            collectionName: 'SavedPost',
            id: savePostId,
            data: { postId, userId },
          });
        } else {
          postSaveServiceHandler.add({
            type: 'create',
            collectionName: 'SavedPost',
            id: savePostId,
            data: { postId, userId },
          });
        }
      },
    });
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
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
