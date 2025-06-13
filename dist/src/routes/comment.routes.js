import { createComment, deleteComment, getComments, updateComment, voteComment, } from '../controllers/comments.controller.js';
import express from 'express';
const router = express.Router();
/**
 * POST /comments/:postId
 * Creates a new comment.
 * :postId is the id of the post to which the comment is being added.
 */
router.post('/:postId', (req, res, next) => createComment(req, res, next));
/**
 * UPDATE /comments/:commentId
 * Updates a comment.
 */
router.patch('/:commentId', (req, res, next) => {
    updateComment(req, res, next);
});
/**
 * DELETE /comments/:commentId
 * Deletes a comment.
 */
router.delete('/:commentId', (req, res, next) => deleteComment(req, res, next));
/**
 * GET /comments
 * Retrieves a comment by its ID.
 */
router.get('/', (req, res, next) => getComments(req, res, next));
/**
 * POST /comments/:commentId/vote/:voteType
 * Votes on a comment.
 * :commentId is the id of the comment to vote on.
 * :voteType is the type of vote to cast (upVote or downVote).
 */
router.post('/:commentId/vote/:voteType', (req, res, next) => voteComment(req, res, next));
export { router as commentRoutes };
