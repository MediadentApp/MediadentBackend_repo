import express from 'express';
import cookieParser from 'cookie-parser';
import logger from './logger.js';
import corsMiddleware from './cors.js';
import rateLimiter from './rateLimiter.js';
import parser from './parser.js';
import multerMiddleware from './multer.js';
import requestInfo from './requestInfo.js';
import sanitizeBody from '#src/middlewares/sanitizeBody.js';
import logApiAccess from '#src/middlewares/apiAccessLogs.middleware.js';

const middlewares = express();

middlewares.use(logger);
middlewares.use(logApiAccess); // Log API access
middlewares.use(corsMiddleware);
middlewares.use(rateLimiter);
middlewares.use(cookieParser(process.env.COOKIE_SECRET));
middlewares.use(parser);
// middlewares.use(multerMiddleware);
middlewares.use(requestInfo);
middlewares.use(sanitizeBody);

export default middlewares;
