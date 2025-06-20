import { deleteAllAccessLogs, getAccessLogs } from '#src/controllers/userController.js';
import express, { NextFunction } from 'express';

const router = express.Router();

router.get('/accesslogs', getAccessLogs);
router.delete('/accesslogs', deleteAllAccessLogs);

export { router as adminRoutes };
