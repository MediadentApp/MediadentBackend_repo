import {
  getAccessLogs,
  deleteAllAccessLogs,
  deleteCommunity,
  deletePost,
  deleteUser,
  getAllCommunities,
  getAllPosts,
  getAllUsers,
  getBannedIPs,
  banIP,
  unbanIP,
} from '#src/controllers/adminController.js';
import express, { NextFunction } from 'express';

// Admin routes
const router = express.Router();

// Routes for accessing and deleting access logs
router.route('/accesslogs').get(getAccessLogs).delete(deleteAllAccessLogs);

// Routes for accessing and deleting users
router.get('/users', getAllUsers);
router.delete('/users/:id', deleteUser);

// Routes for accessing and deleting communities
router.get('/communities', getAllCommunities);
router.delete('/communities/:id', deleteCommunity);

// Routes for accessing and deleting posts
router.get('/posts', getAllPosts);
router.delete('/posts/:id', deletePost);

// Routes for banning and unbanning user ips
router
  .route('/banned-ips')
  .get(getBannedIPs) // Get all banned IPs
  .post(banIP); // Ban a specific IP

router.route('/banned-ips/:id').delete(unbanIP); // Unban a specific IP

export { router as adminRoutes };
