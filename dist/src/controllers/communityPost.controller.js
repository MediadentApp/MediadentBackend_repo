import appConfig from '../config/appConfig.js';
import { ErrorCodes } from '../config/constants/errorCodes.js';
import responseMessages from '../config/constants/responseMessages.js';
import { fetchPostPipelineStage } from '../helper/fetchPostAggregationPipeline.js';
import ImageUpload from '../libs/imageUpload.js';
import { deleteImagesFromS3 } from '../libs/s3.js';
import Community, { CommunityInvite } from '../models/community.model.js';
import { CommunityFollowedBy } from '../models/communityFollowedBy.model.js';
import Post from '../models/post.model.js';
import { PostSave } from '../models/postSave.model.js';
import { PostVote } from '../models/postVote.model.js';
import followCommunityServiceHandler from '../services/communityFollow.service.js';
import postSaveServiceHandler from '../services/postSave.service.js';
import postViewServiceHandler from '../services/postView.service.js';
import { PostSortOptions, PostSortRangeOptions, VoteEnum } from '../types/enum.js';
import ApiError from '../utils/ApiError.js';
import { FetchPaginatedDataWithAggregation } from '../utils/ApiPaginatedResponse.js';
import ApiResponse, { ApiPaginatedResponse } from '../utils/ApiResponse.js';
import catchAsync from '../utils/catchAsync.js';
import { getUpdateObj } from '../utils/dataManipulation.js';
import { DebouncedExecutor } from '../utils/DebouncedExecutor.js';
import mongoose from 'mongoose';
const followCommunityExecutor = new DebouncedExecutor();
const votePostExecutor = new DebouncedExecutor(1000, 100);
const savePostExecutor = new DebouncedExecutor();
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
    const { name, description, type, moderators } = req.body;
    const { id: parentId } = req.params;
    const files = req.files;
    if (!name) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NAME_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
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
            return next(new ApiError(responseMessages.APP.COMMUNITY.PARENT_NOT_FOUND, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
        }
    }
    // 🖼️ Upload images only after validation
    let imageUploadResp;
    if (files) {
        const filesData = [];
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
    const slug = `${name
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, '-')}`;
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
export const updateCommunity = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const files = req.files;
    const updateData = getUpdateObj(['description', 'type', 'moderators'], req.body);
    const community = await Community.findById(id);
    if (!community) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }
    const { avatarUrl: oldAvatarUrl, bannerUrl: oldBannerUrl } = community;
    let imageUploadResp;
    if (files) {
        const deleteImages = [];
        if (files.avatar?.length)
            deleteImages.push(oldAvatarUrl);
        if (files.banner?.length)
            deleteImages.push(oldBannerUrl);
        if (deleteImages.length) {
            void deleteImagesFromS3(deleteImages); // non-blocking
        }
        const filesData = [];
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
                if (file.fileName === 'avatar')
                    updateData.avatarUrl = file.url;
                if (file.fileName === 'banner')
                    updateData.bannerUrl = file.url;
            }
        }
    }
    Object.assign(community, updateData);
    await community.save();
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, community);
});
/**
 * Update a community avatar by its community ID.
 *
 * Route: PATCH /community/:id/avatar
 */
export const updateCommunityAvatar = catchAsync(async (req, res, next) => {
    const { id: communityId } = req.params;
    const file = req.files?.avatar?.[0];
    if (!file) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.IMAGE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    const community = await Community.findById(communityId);
    if (!community) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    if (community.owner.toString() !== req.user._id.toString()) {
        return next(new ApiError(responseMessages.AUTH.UNAUTHENTICATED, 403, ErrorCodes.CLIENT.UNAUTHORIZED));
    }
    const oldAvatarUrl = community.avatarUrl;
    const uploadResp = await ImageUpload({
        files: [
            {
                fileName: file.fieldname ?? file.originalname,
                mimeType: file.mimetype,
                fileBase64: file.buffer.toString('base64'),
            },
        ],
        username: req.user.username ?? 'auto',
    });
    const avatarUrl = uploadResp?.uploaded[0]?.url ?? '';
    community.avatarUrl = avatarUrl;
    await community.save();
    // 🧹 Delete old image if it existed (non-blocking)
    if (oldAvatarUrl)
        void deleteImagesFromS3([oldAvatarUrl]);
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, { avatarUrl });
});
/**
 * Update a community banner by its community ID.
 *
 * Route: PATCH /community/:id/banner
 */
export const updateCommunityBanner = catchAsync(async (req, res, next) => {
    const { id: communityId } = req.params;
    const file = req.files?.banner?.[0];
    if (!file) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.BANNER_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    const community = await Community.findById(communityId);
    if (!community) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    if (community.owner.toString() !== req.user._id.toString()) {
        return next(new ApiError(responseMessages.AUTH.UNAUTHENTICATED, 403, ErrorCodes.CLIENT.UNAUTHORIZED));
    }
    const oldBannerUrl = community.bannerUrl;
    const uploadResp = await ImageUpload({
        files: [
            {
                fileName: file.fieldname ?? file.originalname,
                mimeType: file.mimetype,
                fileBase64: file.buffer.toString('base64'),
            },
        ],
        username: req.user.username ?? 'auto',
    });
    const bannerUrl = uploadResp?.uploaded[0]?.url ?? '';
    community.bannerUrl = bannerUrl;
    await community.save();
    // 🧹 Delete old image if it existed (non-blocking)
    if (oldBannerUrl)
        void deleteImagesFromS3([oldBannerUrl]);
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, { bannerUrl });
});
/**
 * Controller to delete a community by ID.
 *
 * Route: DELETE /communitypost/:communityId/
 */
export const deleteCommunity = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    // const community = await Community.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    const community = await Community.findByIdAndDelete(id);
    if (!community) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
/**
 * Controller to retrieve a single community by slug.
 *
 * Route: GET /community/:slug
 */
export const getCommunityBySlug = catchAsync(async (req, res, next) => {
    const { slug } = req.params;
    if (!slug) {
        return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    // const community = await Community.findOne({ slug }).lean();
    const community = await Community.aggregate([
        // { $match: { $and: [{ slug: slug }, { isDeleted: false }] } },
        { $match: { slug } },
        {
            $lookup: {
                from: 'communityfollowings',
                let: { communityId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $eq: ['$communityId', '$$communityId'] }, { $eq: ['$userId', req.user._id] }],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: 'followedByUser',
            },
        },
        {
            $addFields: {
                isFollowing: {
                    $cond: {
                        if: { $gt: [{ $size: '$followedByUser' }, 0] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                followedByUser: 0,
            },
        },
    ]);
    if (!community.length) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404));
    }
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, community[0]);
});
/**
 * Controller to fetch a paginated list of communities with optional search.
 *
 * Route: GET /community?search=xyz&page=1&limit=10
 */
export const getCommunities = catchAsync(async (req, res) => {
    const fetchedData = await FetchPaginatedDataWithAggregation(Community, [
        // {
        //   $match: { isDeleted: false },
        // },
        {
            $lookup: {
                from: 'communityfollowings',
                let: { communityId: '$_id' },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [{ $eq: ['$communityId', '$$communityId'] }, { $eq: ['$userId', req.user._id] }],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: 'followedByUser',
            },
        },
        {
            $addFields: {
                isFollowing: {
                    $cond: {
                        if: { $gt: [{ $size: '$followedByUser' }, 0] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                followedByUser: 0,
            },
        },
    ], {
        ...req.query,
        sortField: req.query.sortField ?? '-createdAt',
        searchFields: req.query.searchFields ?? ['name'],
    });
    // const fetchedData = await FetchPaginatedData<ICommunity>(Community, {
    //   ...req.query,
    //   sortField: req.query.sortField ?? '-createdAt',
    //   searchFields: req.query.searchFields ?? ['name'],
    // });
    return ApiPaginatedResponse(res, fetchedData);
});
/**
 * Controller to follow/unfollow a community.
 *
 * Route: POST /community/:id/follow/toggle
 */
export const toggleFollowCommunity = catchAsync(async (req, res, next) => {
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
            }
            else {
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
});
/**
 * Controller to fetch community that the user is following.
 *
 * Route: GET /community/follows
 */
export const followsCommunity = catchAsync(async (req, res, next) => {
    const userId = req.user._id;
    const communityId = req.params.id;
    const searchCriteria = {
        userId,
    };
    if (communityId) {
        searchCriteria.communityId = communityId;
    }
    const fetchedData = await FetchPaginatedDataWithAggregation(CommunityFollowedBy, [
        {
            $match: searchCriteria,
        },
        { $sort: { createdAt: -1 } },
        {
            $lookup: {
                from: 'communities',
                localField: 'communityId',
                foreignField: '_id',
                as: 'community',
                pipeline: [
                    {
                        $project: {
                            _id: 1,
                            name: 1,
                            slug: 1,
                            description: 1,
                            avatarUrl: 1,
                            followersCount: 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: '$community',
        },
        {
            $replaceRoot: { newRoot: '$community' },
        },
        {
            $addFields: {
                isFollowing: true,
            },
        },
    ], {
        ...req.query,
        searchFields: req.query.searchFields ?? ['name'],
        pageSize: req.query.pageSize ?? '30',
    });
    return ApiPaginatedResponse(res, fetchedData);
});
/**
 * Controller to fetch a paginated list of community posts.
 *
 * Route: GET /communitypost/:communityId/posts
 */
export const getAllCommunitypost = catchAsync(async (req, res, next) => {
    const { communityId } = req.params;
    const userId = req.user._id;
    const sort = req.query.sortField ?? PostSortOptions.Hot;
    let range = req.query.range ?? PostSortRangeOptions.All;
    const matchStage = {
        communityId: new mongoose.Types.ObjectId(communityId),
    };
    // Custom sort logic
    const sortStage = (() => {
        switch (sort) {
            case 'New':
                return { createdAt: -1 };
            case 'Top':
                return { netVotes: -1 };
            case 'Controversial':
                return { commentsCount: -1 };
            case 'Hot':
                range = PostSortRangeOptions.Now;
                return { popularityScore: -1 };
            default:
                return { popularityScore: -1 };
        }
    })();
    // Apply time range filter if applicable
    const now = new Date();
    if (range && range !== 'all') {
        switch (range) {
            case 'now':
                matchStage.createdAt = {
                    $gte: new Date(now.getTime() - 10 * 60 * 1000), // 10 minutes ago
                    $lte: now,
                };
                break;
            case 'today':
                const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
                matchStage.createdAt = {
                    $gte: startOfTodayUTC,
                    $lte: now,
                };
                break;
            case 'week':
                matchStage.createdAt = {
                    $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
                    $lte: now,
                };
                break;
            case 'month':
                const oneMonthAgo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, now.getUTCDate()));
                matchStage.createdAt = {
                    $gte: oneMonthAgo,
                    $lte: now,
                };
                break;
            case 'year':
                const oneYearAgo = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()));
                matchStage.createdAt = {
                    $gte: oneYearAgo,
                    $lte: now,
                };
                break;
        }
    }
    const fetchedData = await FetchPaginatedDataWithAggregation(Post, [{ $match: matchStage }, { $sort: sortStage }], {
        page: req.query.page ?? '1',
        pageSize: req.query.pageSize ?? '10',
        searchValue: req.query.searchValue ?? '',
        searchFields: req.query.searchFields ?? ['title', 'content'],
        populateFields: req.query.populateFields,
    }, [...fetchPostPipelineStage(String(userId))]);
    return ApiPaginatedResponse(res, fetchedData);
});
/**
 * Controller to retrieve a single community post by ID or slug.
 *
 * Route: GET /communitypost/:communityId/:postId
 */
export const getCommunityPostByIdentifier = catchAsync(async (req, res, next) => {
    const { communityId, identifier } = req.params;
    const { _id: userId } = req.user;
    // const community = await Community.exists({ _id: communityId }).lean();
    // if (!community) {
    //   return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    // }
    const searchCriteria = {};
    const identifierIsID = mongoose.Types.ObjectId.isValid(identifier);
    if (identifierIsID) {
        searchCriteria._id = identifier;
    }
    else {
        searchCriteria.slug = identifier;
    }
    // const post = await Post.findOne(searchCriteria).populate('authorId communityId').lean({ virtuals: true });
    const post = await Post.aggregate([
        { $match: searchCriteria },
        {
            $lookup: {
                from: 'communities',
                localField: 'communityId',
                foreignField: '_id',
                as: 'communityId',
                pipeline: [
                    {
                        $lookup: {
                            from: 'communityfollowings',
                            let: { communityId: '$_id' },
                            pipeline: [
                                {
                                    $match: {
                                        $expr: {
                                            $and: [{ $eq: ['$communityId', '$$communityId'] }, { $eq: ['$userId', req.user._id] }],
                                        },
                                    },
                                },
                                { $limit: 1 },
                            ],
                            as: 'followedByUser',
                        },
                    },
                    {
                        $addFields: {
                            isFollowing: {
                                $cond: {
                                    if: { $gt: [{ $size: '$followedByUser' }, 0] },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            followedByUser: 0,
                        },
                    },
                ],
            },
        },
        { $unwind: '$communityId' },
        ...fetchPostPipelineStage(String(userId)),
    ]);
    if (!post) {
        return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, post[0]);
});
/**
 * Controller to create a new community post.
 *
 * Route: POST /communitypost/:communityId
 */
export const communityPost = catchAsync(async (req, res, next) => {
    const { title, content = '', tags = '' } = req.body;
    const { communityId } = req.params;
    const files = req.files;
    const user = req.user;
    // 1. Post limit check
    if (user.postsCount >= appConfig.app.post.allowedPostsPerUser) {
        return next(new ApiError(responseMessages.APP.POST.POST_LIMIT_EXCEEDED, 400, ErrorCodes.APP.POST.LIMIT_EXCEEDED));
    }
    // 2. Validate required inputs
    if (!title?.trim()) {
        return next(new ApiError(responseMessages.APP.POST.TITLE_REQUIRED, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    if (!communityId?.trim()) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.INVALID_ID, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    // 3. Validate community existence
    const communityExists = await Community.exists({ _id: communityId }).lean();
    if (!communityExists) {
        return next(new ApiError(responseMessages.APP.COMMUNITY.NOT_FOUND, 404, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    // 4. Process file uploads if any
    let mediaUrls = [];
    if (files?.length) {
        const filesData = files.map(file => ({
            fileName: `${file.originalname?.split('.')[0] || 'image'}-${user.username}-post`,
            mimeType: file.mimetype,
            fileBase64: file.buffer.toString('base64'),
        }));
        const uploadResult = await ImageUpload({ files: filesData, username: user.username ?? 'auto' });
        mediaUrls = uploadResult?.uploaded?.map(f => f.url) ?? [];
    }
    // 5. Construct post data
    const allTags = tags ? Array.from(new Set([...JSON.parse(tags), `${user.fullName}`])) : [`${user.fullName}`];
    const slug = `${title
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, '') // remove special characters except word chars, spaces, and hyphens
        .replace(/\s+/g, '-')}-${Date.now()}`;
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
});
/**
 * Controller to delete a community post by ID.
 *
 * Route: DELETE /communitypost/:communityId/:postId
 */
export const deleteCommunityPost = catchAsync(async (req, res, next) => {
    const { communityId, postId } = req.params;
    // const post = await Community.findByIdAndUpdate({ communityId, _id: postId }, { isDeleted: true }, { new: true });
    const post = await Post.findByIdAndDelete({ _id: postId });
    if (!post) {
        return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
/**
 * Controller to update a community post by ID.
 *
 * Route: PATCH /communitypost/:communityId/:postId
 */
export const updateCommunityPost = catchAsync(async (req, res, next) => {
    const { communityId, postId } = req.params;
    const files = req.files;
    const post = await Post.findOneAndUpdate({ communityId, _id: postId }, { $set: getUpdateObj(['title', 'content', 'tags'], req.body) }, { new: true, upsert: false });
    if (!post) {
        return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    if (files && files.length) {
        const filesData = files.map(file => ({
            fileName: `${file.originalname ? `${file.originalname.split('.')[0]}-` : ''}` + `${req.user.username}-` + 'post',
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
});
/**
 * Controller to vote on a community post by ID.
 *
 * Route: POST /communitypost/:communityId/:postId/vote/:voteType
 */
export const votePost = catchAsync(async (req, res, next) => {
    const { communityId, postId } = req.params;
    const { voteType } = req.params;
    const userId = req.user._id;
    const voteId = `${userId}-${postId}`;
    if (!Object.values(VoteEnum).includes(voteType)) {
        return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
    }
    const post = await Post.exists({ _id: postId }).lean();
    if (!post) {
        return next(new ApiError(responseMessages.APP.POST.POST_NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }
    const existingVote = await PostVote.findOne({ postId, userId });
    votePostExecutor.addOperation({
        id: voteId,
        query: async () => {
            let voteOp;
            let updateOp;
            if (!existingVote) {
                // New vote
                voteOp = PostVote.create({ postId, userId, voteType });
                updateOp = Post.updateOne({ _id: postId }, { $inc: voteType === VoteEnum.upVote ? { upvotesCount: 1 } : { downvotesCount: 1 } });
            }
            else if (existingVote.voteType === voteType) {
                // Toggle vote off
                voteOp = PostVote.deleteOne({ _id: existingVote._id });
                updateOp = Post.updateOne({ _id: postId }, { $inc: voteType === VoteEnum.upVote ? { upvotesCount: -1 } : { downvotesCount: -1 } });
            }
            else {
                // Switch vote
                voteOp = PostVote.updateOne({ _id: existingVote._id }, { voteType });
                updateOp = Post.updateOne({ _id: postId }, voteType === VoteEnum.upVote
                    ? { $inc: { upvotesCount: 1, downvotesCount: -1 } }
                    : { $inc: { downvotesCount: 1, upvotesCount: -1 } });
            }
            // Execute in parallel without blocking
            // await
            Promise.all([voteOp, updateOp]);
        },
    });
    // Optionally return fresh counts if needed (only if needed on frontend)
    // const updated = await Post.findById(postId).select('upvotesCount downvotesCount');
    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS
    // , {
    // upvotesCount: updated?.upvotesCount || 0,
    // downvotesCount: updated?.downvotesCount || 0,
    // }
    );
});
/**
 * Controller to track a community post view by ID.
 *
 * Route: POST /communitypost/:communityId/:postId/view
 */
export const trackPostView = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const { _id: userId } = req.user;
    postViewServiceHandler.add({
        type: 'create',
        collectionName: 'PostView',
        id: `${userId}-${postId}`,
        data: { postId, userId },
    });
    ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
});
/**
 * Controller to save a community post by ID.
 *
 * Route: POST /communitypost/:communityId/:postId/save
 */
export const savePost = catchAsync(async (req, res, next) => {
    const { postId } = req.params;
    const { _id: userId } = req.user;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
        return next(new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
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
            }
            else {
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
});
// WIP
export const inviteToCommunity = catchAsync(async (req, res, next) => {
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
