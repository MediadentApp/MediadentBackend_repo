const jwt = require('jsonwebtoken');
const User = require('@src/models/userModel');
const AppError = require('@src/utils/appError');
const catchAsync = require('@src/utils/catchAsync');
const passport = require('passport');
require('@src/config/passport.js');

exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleAuthCallback = passport.authenticate('google', {
  failureRedirect: '/login',
  successRedirect: '/success'
});

exports.googleSignup = catchAsync(async (req, res, next) => {
  // 1) Getting the token and checking if it's there
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token || token === null) return next(new AppError('Google Login Failed'), 406);

  const decodedToken = jwt.decode(token, { json: true });
  // console.log(decodedToken);

  const { given_name: firstName, family_name: lastName, email, email_verified, picture: google_picture } = decodedToken;

  if (!email_verified) return next(new AppError('Your email is not verified by Google', 401));

  const userExists = await User.findOne({ email });
  // if (userExists) return next(new AppError('User already Exist, Redirect to Login page', 406));
  if (userExists) {
    createSendToken(userExists, 200, res);
  } else {
    const newUser = await User.create({
      firstName: firstName,
      lastName: lastName,
      email: email,
      googleAccount: true
    });
    createSendToken(newUser, 201, res);
  }
});
