const morgan = require('morgan');
const express = require('express');
const multer = require('multer');
const cors = require('cors');

const middleware = express();
const upload = multer();

const allowedOrigins = [
  'http://localhost:3000',  // Local development
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

middleware.use(cors(corsOptions));

if (process.env.NODE_ENV === 'development') {
  middleware.use(morgan('dev'));
}

middleware.use(express.json());
// middleware.use(express.urlencoded({ extended: true }));
middleware.use(upload.none());

middleware.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

module.exports = middleware;
