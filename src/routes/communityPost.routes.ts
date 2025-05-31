import {
  createCommunity,
  communityPost,
  getCommunities,
  getCommunityBySlug,
  updateCommunity,
  getCommunityPost,
  getAllCommunitypost,
  deleteCommunity,
  deleteCommunityPost,
  updateCommunityPost,
  votePost,
  trackPostView,
  savePost,
  toggleFollowCommunity,
  followsCommunity,
} from '#src/controllers/communityPost.controller.js';
import { communityCreationUpload, postUpload } from '#src/middlewares/multerPosts.js';
import { AppRequest, AppRequestBody, AppRequestParams } from '#src/types/api.request.js';
import { AppPaginatedRequest } from '#src/types/api.request.paginated.js';
import { AppResponse } from '#src/types/api.response.js';
import { AppPaginatedResponse } from '#src/types/api.response.paginated.js';
import { CommunityPostParam } from '#src/types/param.communityPost.js';
import { IdParam, SlugParam } from '#src/types/param.js';
import { QueryParam } from '#src/types/query.js';
import { ICommunityBodyDTO } from '#src/types/request.community.js';
import { PostBody } from '#src/types/request.post.js';
import express, { NextFunction } from 'express';

const router = express.Router();

/**
 * POST /community
 * Creates a new community.
 */
router.post(
  '/community',
  communityCreationUpload,
  (req: AppRequest<IdParam, ICommunityBodyDTO>, res: AppResponse, next: NextFunction) => createCommunity(req, res, next)
);

/**
 * GET /community
 * Retrieves a list of communities based on query (search, pagination).
 */
router.get('/community', (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) =>
  getCommunities(req, res, next)
);

/**
 * POST /community/:id
 * Creates a new sub-community under a parent community.
 */
router.post(
  '/community/:id',
  communityCreationUpload,
  (req: AppRequest<IdParam, ICommunityBodyDTO>, res: AppResponse, next: NextFunction) => createCommunity(req, res, next)
);

/**
 * PATCH /community/:id
 * Updates an existing community.
 */
router.patch(
  '/community/:id',
  communityCreationUpload,
  (req: AppRequest<IdParam, ICommunityBodyDTO>, res: AppResponse, next: NextFunction) => updateCommunity(req, res, next)
);

/**
 * DELETE /community/:id
 * Deletes a community by its ID.
 */
router.delete('/community/:id', (req: AppRequestParams<IdParam>, res: AppResponse, next: NextFunction) =>
  deleteCommunity(req, res, next)
);

/**
 * GET /community/follows
 * Retrieves a list of communities that the user is following.
 */
router.get('/community/follows', (req: AppPaginatedRequest, res: AppPaginatedResponse, next: NextFunction) =>
  followsCommunity(req, res, next)
);

/**
 * GET /community/:slug
 * Retrieves a single community by its unique slug/name.
 */
router.get('/community/:slug', (req: AppRequestParams<SlugParam>, res: AppResponse, next: NextFunction) =>
  getCommunityBySlug(req, res, next)
);

/**
 * PATCH /community/:id/follow/toggle
 * Toggle following a community.
 */
router.patch('/community/:id/follow/toggle', (req: AppRequestParams<IdParam>, res: AppResponse, next: NextFunction) =>
  toggleFollowCommunity(req, res, next)
);

/**
 * POST /communitypost/:communityId
 * Creates a new post for a community.
 */
router.post(
  '/communitypost/:communityId',
  postUpload,
  (req: AppRequestBody<PostBody, CommunityPostParam>, res: AppResponse, next: NextFunction) =>
    communityPost(req, res, next)
);

/**
 * PATCH /communitypost/:communityId/:postId
 * Updates a post within a community.
 */
router.patch(
  '/communitypost/:communityId/:postId',
  postUpload,
  (req: AppRequestBody<PostBody, CommunityPostParam>, res: AppResponse, next: NextFunction) =>
    updateCommunityPost(req, res, next)
);

/**
 * GET /communitypost/:communityId/posts
 * Retrieves a list of posts related to a specific community.
 * It can also retrieve all posts made by a specific author in a community.
 */
router.get(
  '/communitypost/:communityId/posts',
  (req: AppPaginatedRequest<CommunityPostParam>, res: AppPaginatedResponse, next: NextFunction) =>
    getAllCommunitypost(req, res, next)
);

/**
 * GET /communitypost/:communityId/:postId
 * Fetches a specific post by its ID within a community.
 */
router.get(
  '/communitypost/:communityId/:postId',
  (req: AppRequestParams<CommunityPostParam, QueryParam>, res: AppResponse, next: NextFunction) =>
    getCommunityPost(req, res, next)
);

/**
 * DELETE /communitypost/:communityId/:postId
 * Deletes a post by its ID within a community.
 */
router.delete(
  '/communitypost/:communityId/:postId',
  (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) =>
    deleteCommunityPost(req, res, next)
);

/**
 * POST /communitypost/:communityId/:postId/vote/:voteType
 * Votes on a post within a community.
 */
router.post(
  '/communitypost/:communityId/:postId/vote/:voteType',
  (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => votePost(req, res, next)
);

/**
 * POST /communitypost/:communityId/:postId/view
 * Views a post within a community.
 */
router.post(
  '/communitypost/:communityId/:postId/view',
  (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => trackPostView(req, res, next)
);

/**
 * POST /communitypost/:communityId/:postId/save
 * Saves a post within a community.
 */
router.patch(
  '/communitypost/:communityId/:postId/save',
  (req: AppRequestParams<CommunityPostParam>, res: AppResponse, next: NextFunction) => savePost(req, res, next)
);

export { router as communityPostRoutes };
