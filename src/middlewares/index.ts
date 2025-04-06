import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import multer from 'multer';

import sanitizeBody from './sanitizeBody.js';

const middleware = express();
const upload = multer();

// Extend Express Request type to include `requestTime`
declare module 'express-serve-static-core' {
  interface Request {
    requestTime?: string;
  }
}

// Use Morgan logger in development mode
if (process.env.NODE_ENV === 'development') {
  middleware.use(morgan('dev'));
}

// Middleware to parse JSON and handle file uploads
middleware.use(express.json());
middleware.use(upload.none());

// Custom middleware to attach request timestamp
middleware.use((req: Request, res: Response, next: NextFunction) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Apply body sanitization middleware
middleware.use(sanitizeBody);

export default middleware;
