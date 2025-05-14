import { createComment, deleteComment, getComments, updateComment } from '#src/controllers/comments.controller.js';
import { AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppResponse } from '#src/types/api.response.js';
import { CommentParam } from '#src/types/param.comment.js';
import { ICommentBody } from '#src/types/request.comment.js';
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
router.put('/:commentId', (req: AppRequestBody<ICommentBody, CommentParam>, res: AppResponse, next: NextFunction) => {
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

export { router as commentRoutes };
