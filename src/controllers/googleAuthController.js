const passport = require('passport');
require('@src/config/passport.js');

exports.googleAuth = passport.authenticate('google', { scope: ['profile', 'email'] });

exports.googleAuthCallback = passport.authenticate('google', {
  failureRedirect: '/login',
  successRedirect: '/success'
});
