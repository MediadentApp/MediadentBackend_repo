const axios = require('axios');
const querystring = require('querystring');
const User = require('@src/models/userModel');
const AppError = require('@src/utils/appError');
const catchAsync = require('@src/utils/catchAsync');
const { createSendToken } = require('@src/utils/authUtils');

exports.googleAuth = (req, res, next) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GOOGLE_REDIRECT_URI)}&scope=openid%20profile%20email`;
  res.redirect(googleAuthUrl);
};

exports.googleAuthCallback = catchAsync(async (req, res, next) => {
  const code = req.query.code;
  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', querystring.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenResponse) return next(new AppError('There was an error access token from google', 500));;

    const accessToken = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const { given_name: firstName, family_name: lastName, email, verified_email, picture: google_picture } = userResponse.data;

    if (!verified_email) return next(new AppError('Your email is not verified by Google', 401));

    const userExists = await User.findOne({ email });
    if (userExists) {
      userExists.googleAccount = true;
      userExists.save();
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

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
});
