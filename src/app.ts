import '#src/../loadenv.js';

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import appConfig from '#src/config/appConfig.js';
import globalErrorHandler from '#src/controllers/errorController.js';
import middlewares from '#src/middlewares/index.js';
import { routes } from '#src/routes/index.js';
import socketRoutes from '#src/routes/socketRoutes.js';
import { unknownRoute } from '#src/controllers/serverHealthController.js';

const app = express();

// Middlewares
app.use(middlewares);

// Routes
app.use('/', routes);

// Handle unknown routes
app.all('/*name', unknownRoute);

// Global error handler
app.use(globalErrorHandler);

// Create HTTP server for both HTTP & WebSocket
const server = createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: [...appConfig.allowedOrigins], // Same allowed origins for WebSocket
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
