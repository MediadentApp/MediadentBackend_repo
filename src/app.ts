import cors, { CorsOptions } from 'cors';
import express, { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import globalErrorHandler from '@src/controllers/errorController';
import middlewares from '@src/middlewares';
import routes from '@src/routes';
import socketRoutes from '@src/routes/socketRoutes';
import AppError from '@src/utils/appError';

const app = express();

// Allowed origins for CORS
const allowedOrigins: string[] = [
  'http://localhost:3000',
  'http://192.168.0.155:3000',
  'https://studenthub-mauve.vercel.app',
];

// CORS Options for HTTP requests
const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV === 'development' &&
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(origin))
    ) {
      callback(null, true); // Allow valid origins
    } else {
      callback(new Error('Not allowed by CORS')); // Block other origins
    }
  },
  optionsSuccessStatus: 200, // Support legacy browsers
};

app.use(cors(corsOptions)); // Apply CORS for HTTP

// Configure rate limiter for general routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  headers: true,
  skip: (req) =>
    !req.headers.origin ||
    allowedOrigins.includes(req.headers.origin) ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    (process.env.NODE_ENV === 'development' &&
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(
        req.headers.origin || '',
      )),
});

app.use(generalLimiter);

// Middlewares
app.use(middlewares);

// Routes
app.use('/', routes);

// Handle unknown routes
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

// Create HTTP server for both HTTP & WebSocket
const server = createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: allowedOrigins, // Same allowed origins for WebSocket
    methods: ['GET', 'POST'],
    allowedHeaders: ['my-custom-header'],
    credentials: true,
  },
});

// Attach io to the app so it can be accessed in other parts of the app
app.set('io', io);

// Handle WebSocket events
socketRoutes(io);

// Export app (for HTTP) and server (for HTTP + WebSocket)
export { app, server };
