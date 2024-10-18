const morgan = require('morgan');
const express = require('express');
const multer = require('multer');

const middleware = express();
const upload = multer();

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
