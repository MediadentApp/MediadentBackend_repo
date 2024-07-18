const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
// const User = require('@src/models/userModel'); // Replace with your user model

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:3001/auth/google/callback'
}, ((accessToken, refreshToken, profile, cb) => {
  console.log({ profile });
  // User.findOrCreate({ googleId: profile.id }, (err, user) => cb(err, user));
  return cb(null, profile);
})));

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});
