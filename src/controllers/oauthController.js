const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const { createSendToken } = require("@src/utils/authUtils");
const catchAsync = require("@src/utils/catchAsync");
const axios = require('axios');
const querystring = require('querystring');

const GOOGLE_REDIRECT_URI = process.env.NODE_ENV === 'development' ? process.env.GOOGLE_REDIRECT_URI_DEV : process.env.GOOGLE_REDIRECT_URI_PROD;
const GITHUB_CLIENT_ID = process.env.NODE_ENV === 'development' ? process.env.GITHUB_CLIENT_ID_DEV : process.env.GITHUB_CLIENT_ID_PROD;
const GITHUB_CLIENT_SECRET = process.env.NODE_ENV === 'development' ? process.env.GITHUB_CLIENT_SECRET_DEV : process.env.GITHUB_CLIENT_SECRET_PROD;

exports.googleAuth = (req, res, next) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&scope=openid%20profile%20email`;
  res.redirect(googleAuthUrl);
};

exports.googleAuthCallback = catchAsync(async (req, res, next) => {
  const code = req.query.code;
  try {
    const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', querystring.stringify({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    if (!tokenResponse) return next(new AppError('There was an error accessing the token from Google', 500));;

    const accessToken = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const { given_name: firstName, family_name: lastName, email, verified_email, picture: google_picture } = userResponse.data;

    if (!verified_email) return next(new AppError('Your email is not verified by Google', 401));

    const userExists = await User.findFullUser({ email });

    if (userExists) {
      if (!userExists.googleAccount) {
        userExists.googleAccount = true;
        await userExists.save({ validateBeforeSave: false });
      }
      const redirectUrl = userExists.isAdditionalInfoFilled();
      createSendToken(userExists, 200, res, { ...(redirectUrl !== false && { redirectUrl }) });
    } else {
      const newUser = await User.create({
        firstName: firstName,
        lastName: lastName,
        email: email,
        googleAccount: true
      });
      const redirectUrl = newUser.isAdditionalInfoFilled();
      createSendToken(newUser, 201, res, { ...(redirectUrl !== false && { redirectUrl }) });
    }

  } catch (error) {
    console.error(error);
    res.status(500).send('Authentication failed');
  }
});

exports.githubAuth = (req, res, next) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user`;
  res.redirect(githubAuthUrl);
};

exports.githubAuthCallback = catchAsync(async (req, res, next) => {
  const code = req.query.code;
  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code: code,
    }, {
      headers: { 'Accept': 'application/json' },
    });

    if (!tokenResponse) return next(new AppError('There was an error access token from github', 500));;

    const accessToken = tokenResponse.data.access_token;
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { 'Authorization': `Bearer ${accessToken}`, 'User-Agent': 'StudenHub' },
    });

    const { avatar_url: github_picture, url: github_url, name, email } = userResponse.data;
    const userExists = await User.findFullUser({ email });

    if (userExists) {
      userExists.githubAccount = true;
      userExists.github_url = github_url;
      await userExists.save();
      const redirectUrl = userExists.isAdditionalInfoFilled();
      createSendToken(userExists, 200, res, { ...(redirectUrl !== false && { redirectUrl }) });
    } else {
      let firstName, lastName;

      if (name.includes(' ')) {
        [firstName, lastName] = name.split(' ');
      } else {
        firstName = name;
        lastName = '';
      }
      const newUser = await User.create({
        firstName: firstName,
        lastName: lastName,
        email: email,
        githubAccount: true,
        github_url: github_url
      });
      const redirectUrl = newUser.isAdditionalInfoFilled();
      createSendToken(newUser, 201, res, { ...(redirectUrl !== false && { redirectUrl }) });
    }

  } catch (error) {
    console.error(error);
    return next(new AppError('Github authentication failed', 500));
  }

});
