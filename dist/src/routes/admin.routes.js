import { deleteAllAccessLogs, getAccessLogs } from '../controllers/userController.js';
import express from 'express';
const router = express.Router();
router.get('/accesslogs', getAccessLogs);
router.delete('/accesslogs', deleteAllAccessLogs);
export { router as adminRoutes };
