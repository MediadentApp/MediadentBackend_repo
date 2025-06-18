import {
  createComment,
  deleteComment,
  getComments,
  getCommentsByUser,
  updateComment,
  voteComment,
} from '#src/controllers/comments.controller.js';
import { AppRequestBody, AppRequestParams, AppRequestQuery } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { CommentParam } from '#src/types/param.comment.js';
import { IdParam } from '#src/types/param.js';
import { ICommentQuery } from '#src/types/query.comment.js';
import { ICommentBody, ICommentVoteBody } from '#src/types/request.comment.js';
import express, { NextFunction } from 'express';

const router = express.Router();

/**
 * POST /comments/:postId
 * Creates a new comment.
 * :postId is the id of the post to which the comment is being added.
 */
router.post('/:postId', (req: AppRequestBody<ICommentBody, CommentParam>, res: AppResponse, next: NextFunction) =>
  createComment(req, res, next)
);

/**
 * UPDATE /comments/:commentId
 * Updates a comment.
 */
router.patch('/:commentId', (req: AppRequestBody<ICommentBody, CommentParam>, res: AppResponse, next: NextFunction) => {
  updateComment(req, res, next);
});

/**
 * DELETE /comments/:commentId
 * Deletes a comment.
 */
router.delete('/:commentId', (req: AppRequestParams<CommentParam>, res: AppResponse, next: NextFunction) =>
  deleteComment(req, res, next)
);

/**
 * GET /comments
 * Retrieves a comment by its ID.
 */
router.get('/', (req: AppRequestQuery<ICommentQuery>, res: AppResponse, next: NextFunction) =>
  getComments(req, res, next)
);

/**
 * GET /comments/user
 * Retrieves a all comments by a user
 */
router.get('/user/:id', (req: AppPaginatedRequest<IdParam>, res: AppPaginatedResponse, next: NextFunction) =>
  getCommentsByUser(req, res, next)
);

/**
 * POST /comments/:commentId/vote/:voteType
 * Votes on a comment.
 * :commentId is the id of the comment to vote on.
 * :voteType is the type of vote to cast (upVote or downVote).
 */
router.post('/:commentId/vote/:voteType', (req: AppRequestParams<CommentParam>, res: AppResponse, next: NextFunction) =>
  voteComment(req, res, next)
);

export { router as commentRoutes };
