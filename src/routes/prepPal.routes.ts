import { canAccessPrepPalSession, createSession } from '#src/controllers/prepPal.controller.js';
import { createSessionSchema } from '#src/zod/prepPal.joi.js';
import { validate } from '#src/middlewares/validate.module.middleware.js';
import { Router } from 'express';

const router: Router = Router();

// router.get('/meta');

router.post('/meta', canAccessPrepPalSession, validate(createSessionSchema), createSession);

export { router as prepPalRoutes };
