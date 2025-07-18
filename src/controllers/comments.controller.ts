import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import Comment from '#src/models/postComment.model.js';
import { CommentVote } from '#src/models/postCommentVote.model.js';
import User from '#src/models/userModel.js';
import CommunityCommentCountsServiceHandler from '#src/services/communityCommentCount.service.js';
import { AppRequestBody, AppRequestParams, AppRequestQuery } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse, IResponseExtraCommentPagination } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { SortMethod, SortOrder, VoteEnum } from '#src/types/enum.js';
import { IPostComment } from '#src/types/model.post.type.js';
import { CommentParam } from '#src/types/param.comment.js';
import { IdParam } from '#src/types/param.js';
import { ICommentQuery } from '#src/types/query.comment.js';
import { ICommentBody, ICommentVoteBody } from '#src/types/request.comment.js';
import ApiError from '#src/utils/ApiError.js';
import { FetchPaginatedDataWithAggregation } from '#src/utils/ApiPaginatedResponse.js';
import ApiResponse, { ApiPaginatedResponse } from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { getUpdateObj } from '#src/utils/dataManipulation.js';
import { findKeyValues, stringToObjectID } from '#src/utils/index.js';
import { NextFunction } from 'express';
import mongoose, { isValidObjectId } from 'mongoose';

/**
 * Controller for creating a new comment.
 * Route: POST /comments/:postId
 */
export const createComment = catchAsync(
  async (req: AppRequestBody<ICommentBody, CommentParam>, res: AppResponse, next: NextFunction) => {
    const { postId } = req.params;
    const { parentId, content, imageUrl } = req.body;

    // Validate inputs
    if (!postId || !content?.trim()) {
      return next(
        new ApiError(
          responseMessages.CLIENT.MISSING_ALL_NECESSARY_REQUEST_DATA,
          400,
          ErrorCodes.CLIENT.MISSING_INVALID_INPUT
        )
      );
    }

    // If parentId is provided, ensure it exists
    if (parentId) {
      const parentExists = await Comment.exists({ _id: parentId });
      if (!parentExists) {
        return next(new ApiError(responseMessages.APP.COMMENT.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
      }
    }

    // Create comment
    const comment = await Comment.create({
      postId,
      parentId,
      userId: req.user._id,
      content: content.trim(),
      imageUrl,
    });

    CommunityCommentCountsServiceHandler.add({
      collectionName: 'communityCommentCount',
      type: 'create',
      id: `CommunityCommentCountsServiceHandler-create-${comment._id.toString()}`,
      data: { postId: comment.postId },
    });

    // Increment parent comment's childrenCount and push child id if applicable
    if (parentId) {
      Comment.findByIdAndUpdate(
        parentId,
        {
          $push: { children: comment._id },
          $inc: { childrenCount: 1 },
        },
        { new: false, lean: true }
      )
        .exec()
        .catch(err => {
          console.error(`Failed to update parent comment ${parentId}:`, err);
        });
    }

    return ApiResponse(res, 201, responseMessages.GENERAL.SUCCESS, comment);
  }
);

/**
 * Controller for deleting a comment.
 * Route: PATCH /comments/:commentId
 */
export const updateComment = catchAsync(
  async (req: AppRequestBody<ICommentBody, CommentParam>, res: AppResponse, next: NextFunction) => {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate inputs
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId) || !content?.trim()) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const update = getUpdateObj(['content', 'imageUrl'], req.body);
    const comment = await Comment.findByIdAndUpdate(commentId, update, { new: true, lean: true });

    if (!comment) {
      return next(new ApiError(responseMessages.APP.COMMENT.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, comment);
  }
);

/**
 * Controller for deleting a comment.
 * Route: DELETE /comments/:commentId
 */
export const deleteComment = catchAsync(
  async (req: AppRequestParams<CommentParam>, res: AppResponse, next: NextFunction) => {
    const { commentId } = req.params;

    // const comment = await Comment.findByIdAndDelete(commentId);
    const comment = await Comment.findByIdAndUpdate(commentId, { isDeleted: true }, { new: true, lean: true });
    if (!comment) {
      return next(new ApiError(responseMessages.APP.COMMENT.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    // CommunityCommentCountsServiceHandler.add({
    //   collectionName: 'communityCommentCount',
    //   type: 'delete',
    //   id: `CommunityCommentCountsServiceHandler-delete-${comment._id.toString()}`,
    //   data: { postId: comment.postId },
    // });

    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
  }
);

/**
 * Controller to get comments with nested children using $graphLookup
 * Route: GET /comments?postId=... OR ?commentId=...
 */
export const getComments = catchAsync(
  async (req: AppRequestQuery<ICommentQuery>, res: AppResponse, next: NextFunction) => {
    const {
      postId,
      commentId,
      limit = '5', // Limit for the top-level comments
      skip = '0', // Skip for pagination of the top-level comments
      page,
      children = '1', // Depth of children (1 = one level, 2 = two levels, etc.)
      childLimit = '5', // Limit for the child comments at each level
      childSkip = '0', // Skip for pagination of child comments
      sortMethod = SortMethod.Votes, // Sort method for top-level comments
      sortOrder = SortOrder.Descending, // Sort order for top-level comments
    } = req.query;

    const depth = Number(children);
    const parsedLimit = Number(limit);
    const parsedPage = Number(page ?? '1');
    const parsedSkip = skip ? Number(skip) : (parsedPage - 1) * parsedLimit;
    const parsedChildLimit = Number(childLimit);
    const parsedChildSkip = Number(childSkip);

    if (!(postId || commentId)) {
      return next(
        new ApiError(
          responseMessages.CLIENT.MISSING_ALL_NECESSARY_REQUEST_DATA,
          400,
          ErrorCodes.CLIENT.MISSING_INVALID_INPUT
        )
      );
    }

    const matchStage = commentId
      ? { _id: new mongoose.Types.ObjectId(commentId.toString()) }
      : {
          postId: new mongoose.Types.ObjectId(postId!.toString()),
          parentId: null, // Top-level comments
        };

    const order = sortOrder === SortOrder.Ascending ? 1 : -1;

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    if (sortMethod === SortMethod.Date) {
      sort.createdAt = order;
    } else if (sortMethod === SortMethod.Votes) {
      sort.voteScore = order; // We'll compute this in the pipeline
    } else {
      sort.createdAt = order; // Default fallback to date sorting
    }

    const commentAggregation: any[] = [
      {
        $match: matchStage,
      },
      ...(postId
        ? [
            {
              $addFields:
                sortMethod === SortMethod.Votes
                  ? { voteScore: { $subtract: ['$upvotesCount', '$downvotesCount'] } }
                  : {},
            },
            { $sort: sort },
            { $skip: parsedSkip },
            { $limit: parsedLimit },
          ]
        : []),
      {
        $graphLookup: {
          from: 'postcomments',
          startWith: '$_id',
          connectFromField: '_id',
          connectToField: 'parentId',
          as: 'children',
          maxDepth: depth,
          depthField: 'level',
        },
      },
      {
        $addFields: {
          // Handling the pagination for children
          children: {
            $map: {
              input: '$children',
              as: 'child',
              in: {
                $mergeObjects: [
                  '$$child',
                  {
                    content: {
                      $cond: {
                        if: '$$child.isDeleted',
                        then: null,
                        else: '$$child.content',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      },
      {
        $addFields: {
          content: {
            $cond: {
              if: { $eq: ['$isDeleted', true] },
              then: null,
              else: '$content',
            },
          },
        },
      },
    ];

    // console.log('commentAggregation: ', JSON.stringify(commentAggregation, null, 2));

    // Execute commentAggregation
    const fetchedComments = await Comment.aggregate(commentAggregation);

    // Fetch votes, Total root comments
    const commentCountSearch = commentId ? { commentId } : { postId };
    const commentIds = findKeyValues(fetchedComments, '_id');
    const userIds = findKeyValues(fetchedComments, 'userId');
    const [totalRootComments, voted, users] = await Promise.all([
      Comment.countDocuments(commentCountSearch),
      CommentVote.find({ userId: req.user._id, commentId: { $in: commentIds } }).lean(),
      User.find({ _id: { $in: userIds } })
        .select('fullName _id username profilePicture')
        .lean(),
    ]);

    const voteMap = new Map(voted.map(vote => [vote.commentId.toString(), vote.voteType]));

    const userMap = new Map(users.map(user => [user._id.toString(), user]));

    // Rebuild tree from flat structure and apply sorting and pagination per level
    const buildTree = (comment: IPostComment, childrenMap: Map<string, IPostComment[]>): IPostComment => {
      const children = childrenMap.get(comment._id.toString()) || [];

      // Pagination logic for each level of children
      const paginatedChildren = children.slice(parsedChildSkip, parsedChildSkip + parsedChildLimit);

      // Sorting for child comments based on votes or date
      const sortedChildren = paginatedChildren.sort((a: IPostComment, b: IPostComment) => {
        if (sortMethod === SortMethod.Votes) {
          const voteA = (a.upvotesCount || 0) - (a.downvotesCount || 0);
          const voteB = (b.upvotesCount || 0) - (b.downvotesCount || 0);
          return order * (voteB - voteA);
        }
        return order * (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      });

      const allComment = {
        ...comment,
        voteType: voteMap.get(comment._id.toString()) ?? null,
        userId: userMap.get(comment.userId.toString()) ?? null,
        children: sortedChildren.map((child: IPostComment) => buildTree(child, childrenMap)),
      };

      return allComment as unknown as IPostComment;
    };

    const structured = fetchedComments.map(base => {
      const all = [base, ...(base.children || [])];
      const byParent = new Map();
      for (const c of all) {
        const pid = c.parentId?.toString();
        if (!byParent.has(pid)) byParent.set(pid, []);
        byParent.get(pid).push(c);
      }

      return buildTree(base, byParent);
    });

    const extra = {
      hasMore: totalRootComments > parsedSkip + parsedLimit,
      totalRootComments,
      rootId: commentId ?? postId,
      depth,
      limit: parsedLimit,
      page: parsedPage,
      skip: parsedSkip,
      childLimit: parsedChildLimit,
      childSkip: parsedChildSkip,
    };

    return ApiResponse<IPostComment[], IResponseExtraCommentPagination>(
      res,
      200,
      responseMessages.GENERAL.SUCCESS,
      commentId ? structured[0] : structured,
      extra
    );
  }
);

/**
 * Controller for voting on a comment.
 *
 * Route: PATCH /comments/:commentId/vote/:voteType
 *
 * Optimization: Add a Redis cache for votes per user/comment to prevent excessive DB lookups.
 * Optionally use MongoDB transactions for safety in edge cases, but for most use cases this is performant and safe enough.
 * maybe no need to wait for any of the transaction to finish before sending a response
 */
export const voteComment = catchAsync(
  async (req: AppRequestParams<CommentParam>, res: AppResponse, next: NextFunction) => {
    const { commentId, voteType } = req.params;
    const userId = req.user._id;

    if (!Object.values(VoteEnum).includes(voteType)) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    const comment = await Comment.exists({ _id: commentId }).lean();
    if (!comment) {
      return next(new ApiError(responseMessages.APP.COMMENT.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    const existingVote = await CommentVote.findOne({ commentId, userId });

    let voteOp: Promise<any>;
    let updateOp: Promise<any>;

    if (!existingVote) {
      // New vote
      voteOp = CommentVote.create({ commentId, userId, voteType });
      updateOp = Comment.updateOne(
        { _id: commentId },
        { $inc: voteType === VoteEnum.upVote ? { upvotesCount: 1 } : { downvotesCount: 1 } }
      );
    } else if (existingVote.voteType === voteType) {
      // Toggle vote off
      voteOp = CommentVote.deleteOne({ _id: existingVote._id });
      updateOp = Comment.updateOne(
        { _id: commentId },
        { $inc: voteType === VoteEnum.upVote ? { upvotesCount: -1 } : { downvotesCount: -1 } }
      );
    } else {
      // Switch vote
      voteOp = CommentVote.updateOne({ _id: existingVote._id }, { voteType });
      updateOp = Comment.updateOne(
        { _id: commentId },
        voteType === VoteEnum.upVote
          ? { $inc: { upvotesCount: 1, downvotesCount: -1 } }
          : { $inc: { downvotesCount: 1, upvotesCount: -1 } }
      );
    }

    // Execute in parallel without blocking
    // await
    Promise.all([voteOp, updateOp]);

    // Optionally return fresh counts if needed (only if needed on frontend)
    // const updated = await Comment.findById(commentId).select('upvotesCount downvotesCount');

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
 * Controller to get all comments of a user.
 *
 * Route: GET /comments/user/:id
 */
export const getUserComments = catchAsync(
  async (req: AppPaginatedRequest<IdParam>, res: AppPaginatedResponse, next: NextFunction) => {
    let { id: userId } = req.params;
    if (userId && !isValidObjectId(userId)) {
      return next(
        new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
      );
    }

    if (!userId) {
      userId = req.user._id;
    }

    const comments = await FetchPaginatedDataWithAggregation<IPostComment>(
      Comment,
      [
        {
          $match: {
            userId: stringToObjectID(userId),
          },
        },
      ],
      {
        page: req.query.page ?? '1',
        pageSize: req.query.pageSize ?? '15',
        sortField: 'createdAt',
        sortOrder: req.query.sortOrder ?? 'desc',
        populateFields: [
          { path: 'postId', select: 'title slug communityId', from: 'posts' },
          { path: 'userId', select: 'username fullName avatarUrl', from: 'users' },
          { path: 'postId.communityId', select: 'avatarUrl slug name', from: 'communities' },
        ],
      },
      []
    );

    return ApiPaginatedResponse(res, comments);
  }
);
