import { githubAuth, githubAuthCallback, googleAuth, googleAuthCallback } from '../controllers/oauthController.js';
import express from 'express';
const router = express.Router();
router.get('/google', googleAuth);
router.get('/google/callback', googleAuthCallback);
router.get('/github', githubAuth);
router.get('/github/callback', githubAuthCallback);
export { router as oauthRoutes };
