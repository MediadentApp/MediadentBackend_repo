const morgan = require('morgan');
const express = require('express');
// const session = require('express-session');
const cors = require('cors');
const passport = require('passport');
require('@src/config/passport.js');

const middleware = express();

const corsOptions = {
  origin: 'http://localhost:3000',
  optionsSuccessStatus: 200,
};

// ! No need for express-session, Delete later
// middleware.use(session({
//   secret: 'Enter your secret key',
//   resave: true,
//   saveUninitialized: true
// }));

middleware.use(cors(corsOptions));

middleware.use(passport.initialize());
// middleware.use(passport.session());

if (process.env.NODE_ENV === 'development') {
  middleware.use(morgan('dev'));
}

middleware.use(express.json());
// middleware.use(express.urlencoded({ extended: true }));

middleware.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

module.exports = middleware;
