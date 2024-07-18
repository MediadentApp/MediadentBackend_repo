const AppError = require('@src/utils/appError');
const catchAsync = require('@src/utils/catchAsync');
const { decode } = require('jsonwebtoken');
const passport = require('passport');
require('@src/config/passport.js');
// const AppError = require('@src/utils/appError');

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
  if (!token) return next(new AppError('Google Login Failed'), 406);

  const decodedToken = decode(token, { json: true });
  // console.log(decodedToken);
  next();
});

/*
{
  iss: 'https://accounts.google.com',
  azp: '242142691782-qvqus0rsghv71ro4m6hk17ibbpajbon5.apps.googleusercontent.com',
  aud: '242142691782-qvqus0rsghv71ro4m6hk17ibbpajbon5.apps.googleusercontent.com',
  sub: '116704943241405106113',
  email: 'v3p51435@gmail.com',
  email_verified: true,
  nbf: 1721300593,
  name: 'Vinay Poojary (Vin)',
  picture: 'https://lh3.googleusercontent.com/a/ACg8ocIQe2qLTJEdck4cuYIobqc_sl5ALoFYKmqxE8x2xiBJ0g6BAdb4mQ=s96-c',
  given_name: 'Vinay',
  family_name: 'Poojary',
  iat: 1721300893,
  exp: 1721304493,
  jti: '6303aacf28ff4d4ace9deeedb0899cb2eae82247'
}
*/
