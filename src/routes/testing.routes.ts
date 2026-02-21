import { generateInterviewQuestions, triggerJob } from '#src/controllers/test.controller.js';
import { sttHandler } from '#src/controllers/test.stt.controller.js';
import { ttsHandler } from '#src/controllers/test.tts.controller.js';
import { audioUpload } from '#src/middlewares/global/multerPosts.js';
import express, { Router } from 'express';

const router: Router = express.Router();

router.post('/interview/generate', generateInterviewQuestions);
router.post('/interview/tts', ttsHandler);
router.post('/interview/stt', audioUpload, sttHandler);
router.post('/trigger-job/test', triggerJob);

export { router as testingRoutes };
