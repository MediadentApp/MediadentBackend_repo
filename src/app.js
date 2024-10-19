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
  'http://localhost:3000',  // Local development
  'http://192.168.0.155:3000',  // Local development
  'https://studenthub-mauve.vercel.app',  // Production API address
  // Add more specific origins if needed
];

// CORS Options
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, etc.)
    if (!origin || allowedOrigins.includes(origin) || ((process.env.NODE_ENV === 'development') && /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(origin))) {
      callback(null, true);  // Allow localhost, production, and local network IPs like 192.168.x.x
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  optionsSuccessStatus: 200,  // For legacy browser support
};

// cors for express/HTTP requests
app.use(cors(corsOptions));

// Middleware
app.use(middlewares);

// Routes
app.use('/', routes);
app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

// HTTP server, Which is consumed by socket.io for websocket communication
// Same server as the one that will handle http request but this will handle websocket connection
const server = createServer(app);

// Create a Socket.IO server and attach it to the HTTP server
// cors for socket.io/websocket communication
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,  // List of allowed origins for Socket.IO
    methods: ['GET', 'POST'],  // HTTP methods allowed in WebSocket requests
    allowedHeaders: ["my-custom-header"],
    credentials: true
  }
});

// Socket.IO connection handling
// Use the socket routes
socketRoutes(io); // Pass the io instance to the socket routes

module.exports = { app, server };
