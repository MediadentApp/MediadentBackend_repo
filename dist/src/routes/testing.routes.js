import { generateInterviewQuestions } from '../controllers/test.controller.js';
import express from 'express';
const router = express.Router();
router.post('/interview/generate', generateInterviewQuestions);
export { router as testingRoutes };
