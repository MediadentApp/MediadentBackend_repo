import {
  getAccessLogs,
  deleteAllAccessLogs,
  deleteCommunity,
  deletePost,
  deleteUser,
  getAllCommunities,
  getAllPosts,
  getAllUsers,
} from '#src/controllers/adminController.js';
import express, { NextFunction } from 'express';

// Admin routes
const router = express.Router();

// Routes for accessing and deleting access logs
router.get('/accesslogs', getAccessLogs);
router.delete('/accesslogs', deleteAllAccessLogs);

// Routes for accessing and deleting users
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

// Routes for accessing and deleting communities
router.get('/communities', getAllCommunities);
router.delete('/communities/:id', deleteCommunity);

// Routes for accessing and deleting posts
router.get('/posts', getAllPosts);
router.delete('/posts/:id', deletePost);

export { router as adminRoutes };
