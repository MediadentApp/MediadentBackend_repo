import express from 'express';
import logger from './logger.js';
import corsMiddleware from './cors.js';
import rateLimiter from './rateLimiter.js';
import parser from './parser.js';
import multerMiddleware from './multer.js';
import requestInfo from './requestInfo.js';
import sanitizeBody from '#src/middlewares/sanitizeBody.js';

const middlewares = express();

middlewares.use(logger);
middlewares.use(corsMiddleware);
middlewares.use(rateLimiter);
middlewares.use(parser);
middlewares.use(multerMiddleware);
middlewares.use(requestInfo);
middlewares.use(sanitizeBody);

export default middlewares;
