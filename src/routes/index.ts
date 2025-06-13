import express, { Router } from 'express';

import userFormatApi from './formatApiRoutes.js';
import { protect, restrict } from '#src/controllers/authController.js';
import { mainRoutes } from '#src/routes/mainRoutes.js';
import { oauthRoutes } from '#src/routes/oauthRoutes.js';
import { userAuthRoutes } from '#src/routes/userAuthRoutes.js';
import { health } from '#src/controllers/serverHealthController.js';
import { communityPostRoutes } from '#src/routes/communityPost.routes.js';
import { commentRoutes } from '#src/routes/comment.routes.js';
import { UserRole } from '#src/types/enum.js';

const router: Router = express.Router();

router.get('/api/v1/health', health);

router.use('/api/v1/auth', userAuthRoutes);
router.use('/oauth2', oauthRoutes);
router.use('/api/v1/userformat', userFormatApi);

router.use('/api/v1/user', protect, mainRoutes);
router.use('/api/v1/center', protect, communityPostRoutes);
router.use('/api/v1/comments', protect, commentRoutes);

export { router as routes };
