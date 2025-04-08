import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import os from 'os';

import userFormatApi from './formatApiRoutes.js';
import { protect } from '#src/controllers/authController.js';
import { mainRoutes } from '#src/routes/mainRoutes.js';
import { oauthRoutes } from '#src/routes/oauthRoutes.js';
import { userAuthRoutes } from '#src/routes/userAuthRoutes.js';

const router: Router = express.Router();

router.get('/health', async (req: Request, res: Response): Promise<void> => {
  try {
    const dbStatus: string = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const loadAvg: number[] = os.loadavg();
    const memoryUsage: NodeJS.MemoryUsage = process.memoryUsage();

    res.status(200).json({
      status: 'ok',
      dbConnection: dbStatus,
      timestamp: Date.now(),
      uptime: process.uptime(),
      loadAvg,
      memoryUsage,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ status: 'error', message: 'Server health check failed' });
  }
});

router.use('/api/v1/user', protect, mainRoutes);
router.use('/api/v1/auth', userAuthRoutes);
router.use('/api/v1/userformat', userFormatApi);
router.use('/oauth2', oauthRoutes);

export { router as routes };
