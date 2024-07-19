const User = require("@src/models/userModel");
const AppError = require("@src/utils/appError");
const { createSendToken } = require("@src/utils/authUtils");
const catchAsync = require("@src/utils/catchAsync");
const axios = require('axios');

exports.githubAuth = (req, res, next) => {
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&scope=user`;
  res.redirect(githubAuthUrl);
};

exports.githubAuthCallback = catchAsync(async (req, res, next) => {
  const code = req.query.code;
  try {
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
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

    const userExists = await User.findOne({ email });
    if (userExists) {
      userExists.githubAccount = true;
      userExists.save();
      createSendToken(userExists, 200, res);
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
        githubAccount: true
      });
      createSendToken(newUser, 201, res);
    }

  } catch (error) {
    console.error(error);
    // res.status(500).send('Authentication failed');
    return next(new AppError('Github authentication failed', 500));
  }

});
