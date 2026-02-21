// Cleanup Queues on shutdown
import '#src/jobs/queueCleanup/index.js';

// Workers
import '#src/jobs/workers/index.js';

// Scheduled jobs
import '#src/jobs/scheduled/index.js';

import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

import appConfig from '#src/config/appConfig.js';
import globalErrorHandler from '#src/controllers/errorController.js';
import middlewares from '#src/middlewares/index.js';
import { routes } from '#src/routes/index.js';
import socketRoutes from '#src/routes/socketRoutes.js';
import { unknownRoute } from '#src/controllers/serverHealthController.js';
import serverAdapter from '#src/jobs/admin.js';

const app = express();

// Load banned IPs to Redis

// trust X-Forwarded-For header
app.set('trust proxy', true);

// Middlewares
app.use(middlewares);

// Routes
app.use('/', routes);

// BullMQ Admin Dashboard
app.use('/admin/queues', serverAdapter.getRouter());

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
