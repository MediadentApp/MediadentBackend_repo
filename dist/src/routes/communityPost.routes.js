import { createCommunity, communityPost, getCommunities, getCommunityBySlug, updateCommunity, getCommunityPostByIdentifier, getAllCommunitypost, deleteCommunity, deleteCommunityPost, updateCommunityPost, votePost, trackPostView, savePost, toggleFollowCommunity, followsCommunity, updateCommunityAvatar, updateCommunityBanner, } from '../controllers/communityPost.controller.js';
import { communityCreationUpload, postUpload } from '../middlewares/multerPosts.js';
import express from 'express';
const router = express.Router();
/**
 * POST /community
 * Creates a new community.
 */
router.post('/community', communityCreationUpload, (req, res, next) => createCommunity(req, res, next));
/**
 * GET /community
 * Retrieves a list of communities based on query (search, pagination).
 */
router.get('/community', (req, res, next) => getCommunities(req, res, next));
/**
 * POST /community/:id
 * Creates a new sub-community under a parent community.
 */
router.post('/community/:id', communityCreationUpload, (req, res, next) => createCommunity(req, res, next));
/**
 * PATCH /community/:id
 * Updates an existing community.
 */
router.patch('/community/:id', communityCreationUpload, (req, res, next) => updateCommunity(req, res, next));
/**
 * PATCH /community/:id/avatar
 * Updates the avatar of a community.
 */
router.patch('/community/:id/avatar', communityCreationUpload, (req, res, next) => updateCommunityAvatar(req, res, next));
/**
 * PATCH /community/:id/banner
 * Updates the banner of a community.
 */
router.patch('/community/:id/banner', communityCreationUpload, (req, res, next) => updateCommunityBanner(req, res, next));
/**
 * DELETE /community/:id
 * Deletes a community by its ID.
 */
router.delete('/community/:id', (req, res, next) => deleteCommunity(req, res, next));
/**
 * GET /community/follows
 * Retrieves a list of communities that the user is following.
 */
router.get('/community/follows', (req, res, next) => followsCommunity(req, res, next));
/**
 * GET /community/follows/:id
 * Retrieves a single community that the user is following.
 */
router.get('/community/follows:id', (req, res, next) => followsCommunity(req, res, next));
/**
 * GET /community/:slug
 * Retrieves a single community by its unique slug/name.
 */
router.get('/community/:slug', (req, res, next) => getCommunityBySlug(req, res, next));
/**
 * PATCH /community/:id/follow/toggle
 * Toggle following a community.
 */
router.patch('/community/:id/follow/toggle', (req, res, next) => toggleFollowCommunity(req, res, next));
/**
 * POST /communitypost/:communityId
 * Creates a new post for a community.
 */
router.post('/communitypost/:communityId', postUpload, (req, res, next) => communityPost(req, res, next));
/**
 * PATCH /communitypost/:communityId/:postId
 * Updates a post within a community.
 */
router.patch('/communitypost/:communityId/:postId', postUpload, (req, res, next) => updateCommunityPost(req, res, next));
/**
 * GET /communitypost/:communityId/posts
 * Retrieves a list of posts related to a specific community.
 * It can also retrieve all posts made by a specific author in a community.
 */
router.get('/communitypost/:communityId/posts', (req, res, next) => getAllCommunitypost(req, res, next));
/**
 * GET /communitypost/:communityId/:identifier
 * Fetches a specific post by its ID or its slug within a community.
 */
router.get('/communitypost/:communityId/:identifier', (req, res, next) => getCommunityPostByIdentifier(req, res, next));
/**
 * DELETE /communitypost/:communityId/:postId
 * Deletes a post by its ID within a community.
 */
router.delete('/communitypost/:communityId/:postId', (req, res, next) => deleteCommunityPost(req, res, next));
/**
 * POST /communitypost/:communityId/:postId/vote/:voteType
 * Votes on a post within a community.
 */
router.post('/communitypost/:communityId/:postId/vote/:voteType', (req, res, next) => votePost(req, res, next));
/**
 * POST /communitypost/:communityId/:postId/view
 * Views a post within a community.
 */
router.post('/communitypost/:communityId/:postId/view', (req, res, next) => trackPostView(req, res, next));
/**
 * POST /communitypost/:communityId/:postId/save
 * Saves a post within a community.
 */
router.patch('/communitypost/:communityId/:postId/save', (req, res, next) => savePost(req, res, next));
export { router as communityPostRoutes };
