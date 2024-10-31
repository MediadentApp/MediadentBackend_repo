const express = require('express');
const middlewares = require('./middlewares');
const routes = require('./routes');
const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const cors = require('cors');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const socketRoutes = require('./routes/socketRoutes');

const app = express();

const allowedOrigins = [
  'http://localhost:3000',
  'http://192.168.0.155:3000',
  'https://studenthub-mauve.vercel.app',
];

// CORS Options for Express HTTP requests
const corsOptions = {
  origin: function (origin, callback) {
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      (process.env.NODE_ENV === 'development' && /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(origin))
    ) {
      callback(null, true);  // Allow valid origins
    } else {
      callback(new Error('Not allowed by CORS'));  // Block other origins
    }
  },
  optionsSuccessStatus: 200,  // Support legacy browsers
};

app.use(cors(corsOptions));  // Apply CORS for HTTP

// Middleware
app.use(middlewares);

// Routes
app.use('/', routes);
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global error handler
app.use(globalErrorHandler);

// HTTP server setup for both HTTP and WebSocket communication
const server = createServer(app);

// Socket.IO initialization with CORS for WebSocket
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,  // Same allowed origins for WebSocket
    methods: ['GET', 'POST'],
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

// Attach io to the app so it can be accessed in other parts of the app
app.set('io', io);

// Socket.IO routes handling
socketRoutes(io);  // Pass io instance to socket routes for handling events

module.exports = { app, server };  // Exports app (for HTTP) and server (for HTTP + WebSocket)
