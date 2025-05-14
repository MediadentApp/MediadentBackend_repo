import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import Comment from '#src/models/comment.model.js';
import { CommentVote } from '#src/models/commentVote.model.js';
import { AppRequestBody, AppRequestParams, AppRequestQuery } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import { SortMethod, SortOrder } from '#src/types/enum.js';
import { IPostComment } from '#src/types/model.post.js';
import { CommentParam } from '#src/types/param.comment.js';
import { ICommentQuery } from '#src/types/query.comment.js';
import { ICommentBody } from '#src/types/request.comment.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import catchAsync from '#src/utils/catchAsync.js';
import { getUpdateObj } from '#src/utils/dataManipulation.js';
import { NextFunction } from 'express';
import mongoose from 'mongoose';

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
 * Route: DELETE /comments/:commentId
 */
export const updateComment = catchAsync(
  async (req: AppRequestBody<ICommentBody, CommentParam>, res: AppResponse, next: NextFunction) => {
    const { commentId } = req.params;
    const { content } = req.body;

    // Validate inputs
    if (!commentId || !content?.trim()) {
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

    const comment = await Comment.findByIdAndDelete(commentId);
    if (!comment) {
      return next(new ApiError(responseMessages.APP.COMMENT.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
    }

    return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS);
  }
);

/**
 * Controller to get comments with nested children using $graphLookup
 * Route: GET /comments?postId=... OR ?commentId=...
 */
export const getComments = catchAsync(async (req, res, next) => {
  const {
    postId,
    commentId,
    children = '1', // Depth of children (1 = one level, 2 = two levels, etc.)
    limit = '5', // Limit for the top-level comments
    skip = '0', // Skip for pagination of the top-level comments
    childLimit = '5', // Limit for the child comments at each level
    childSkip = '0', // Skip for pagination of child comments
    sortMethod = SortMethod.Date, // Sort method for top-level comments
    sortOrder = SortOrder.Descending, // Sort order for top-level comments
  } = req.query;

  const depth = Number(children);
  const parsedLimit = Number(limit);
  const parsedSkip = Number(skip);
  const parsedChildLimit = Number(childLimit);
  const parsedChildSkip = Number(childSkip);

  if (!postId && !commentId) {
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

  const aggregation: any[] = [
    {
      $match: matchStage,
    },
    ...(postId
      ? [
          {
            $addFields:
              sortMethod === SortMethod.Votes ? { voteScore: { $subtract: ['$upvotesCount', '$downvotesCount'] } } : {},
          },
          { $sort: sort },
          { $skip: parsedSkip },
          { $limit: parsedLimit },
        ]
      : []),
    {
      $graphLookup: {
        from: 'comments',
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
                  voteScore: {
                    $subtract: ['$$child.upvotesCount', '$$child.downvotesCount'],
                  },
                },
              ],
            },
          },
        },
      },
    },
  ];

  // Execute aggregation
  const results = await Comment.aggregate(aggregation);

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

    return {
      ...comment,
      children: sortedChildren.map((child: IPostComment) => buildTree(child, childrenMap)),
    } as IPostComment;
  };

  const structured = results.map(base => {
    const all = [base, ...(base.children || [])];
    const byParent = new Map();
    for (const c of all) {
      const pid = c.parentId?.toString();
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(c);
    }

    return buildTree(base, byParent);
  });

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, commentId ? structured[0] : structured);
});

/**
 * Controller for voting on a comment.
 *
 * Route: PATCH /comments/:commentId/vote
 */
export const voteComment = catchAsync(async (req, res, next) => {
  const { commentId } = req.params;
  const { voteType } = req.body; // 'upvote' or 'downvote'
  const userId = req.user._id;

  if (!['upvote', 'downvote'].includes(voteType)) {
    return next(
      new ApiError(responseMessages.CLIENT.MISSING_INVALID_INPUT, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT)
    );
  }

  const comment = await Comment.findById(commentId);
  // const comment = await Comment.findById(commentId).populate('children');
  if (!comment) {
    return next(new ApiError(responseMessages.APP.COMMENT.NOT_FOUND, 404, ErrorCodes.DATA.NOT_FOUND));
  }

  const existingVote = await CommentVote.findOne({ commentId, userId });

  // Determine vote action
  if (!existingVote) {
    await CommentVote.create({ commentId, userId, voteType });
    if (voteType === 'upvote') comment.upvotesCount += 1;
    else comment.downvotesCount += 1;
  } else if (existingVote.voteType === voteType) {
    // Remove the vote (toggle off)
    await CommentVote.deleteOne({ _id: existingVote._id });
    if (voteType === 'upvote') comment.upvotesCount -= 1;
    else comment.downvotesCount -= 1;
  } else {
    // Switch vote
    existingVote.voteType = voteType;
    await existingVote.save();
    if (voteType === 'upvote') {
      comment.upvotesCount += 1;
      comment.downvotesCount -= 1;
    } else {
      comment.downvotesCount += 1;
      comment.upvotesCount -= 1;
    }
  }

  await comment.save();

  return ApiResponse(res, 200, responseMessages.GENERAL.SUCCESS, {
    upvotesCount: comment.upvotesCount,
    downvotesCount: comment.downvotesCount,
  });
});
