const morgan = require('morgan');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const passport = require('passport');
require('@src/config/passport.js');

const middleware = express();
const upload = multer();

const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
};

middleware.use(cors(corsOptions));

middleware.use(passport.initialize());

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
