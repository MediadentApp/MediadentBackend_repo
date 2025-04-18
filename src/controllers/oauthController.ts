import axios from 'axios';
import { Request, Response, NextFunction } from 'express';
import querystring from 'querystring';

import ApiError from '#src/utils/ApiError.js';
import User from '#src/models/userModel.js';
import catchAsync from '#src/utils/catchAsync.js';
import { createSendToken } from '#src/utils/authUtils.js';
import { IOAuthCallbackQuery } from '#src/types/query.auth.js';
import { IResponseMessage } from '#src/types/api.response.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';

const GOOGLE_REDIRECT_URI =
  process.env.NODE_ENV === 'development' ? process.env.GOOGLE_REDIRECT_URI_DEV : process.env.GOOGLE_REDIRECT_URI_PROD;

const GITHUB_CLIENT_ID =
  process.env.NODE_ENV === 'development' ? process.env.GITHUB_CLIENT_ID_DEV : process.env.GITHUB_CLIENT_ID_PROD;

const GITHUB_CLIENT_SECRET =
  process.env.NODE_ENV === 'development' ? process.env.GITHUB_CLIENT_SECRET_DEV : process.env.GITHUB_CLIENT_SECRET_PROD;

export const googleAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${
      process.env.GOOGLE_CLIENT_ID
    }&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI!)}&scope=openid%20profile%20email`;
    res.redirect(googleAuthUrl);
  } catch (error) {
    next(new ApiError('Failed to initiate Google authentication' as IResponseMessage, 500));
  }
};

export const googleAuthCallback = catchAsync(
  async (req: Request<{}, {}, {}, IOAuthCallbackQuery>, res: Response, next: NextFunction) => {
    const code = req.query.code;

    if (!code) {
      return next(
        new ApiError('Google Authorization code is missing' as IResponseMessage, 400, ErrorCodes.CLIENT.BAD_REQUEST)
      );
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://oauth2.googleapis.com/token',
        querystring.stringify({
          code,
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      if (!tokenResponse?.data?.access_token) {
        return next(new ApiError('Failed to retrieve access token from Google' as IResponseMessage, 500));
      }

      const accessToken = tokenResponse.data.access_token;

      // Fetch user details
      const userResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse?.data) {
        return next(new ApiError('Failed to retrieve user data from Google' as IResponseMessage, 500));
      }

      const {
        given_name: firstName,
        family_name: lastName,
        email,
        verified_email: verifiedEmail,
        picture: googlePicture,
      } = userResponse.data;

      if (!verifiedEmail) {
        return next(
          new ApiError('Your email is not verified by Google' as IResponseMessage, 401, ErrorCodes.CLIENT.FORBIDDEN)
        );
      }

      let user = await User.findFullUser({ email });

      if (user) {
        if (!user.googleAccount) {
          user.googleAccount = true;
          await user.save({ validateBeforeSave: false });
        }
      } else {
        user = await User.create({
          firstName,
          lastName,
          email,
          googleAccount: true,
        });
      }

      const redirectUrl = user.isAdditionalInfoFilled();
      createSendToken(user, 200, res, {
        ...(redirectUrl && { redirectUrl }),
      });
    } catch (error) {
      console.error('Google Authentication Error:', error);
      next(new ApiError('Google Authentication failed. Please try again.' as IResponseMessage, 500));
    }
  }
);

export const githubAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=user`;
    res.redirect(githubAuthUrl);
  } catch (error) {
    next(new ApiError('Failed to initiate GitHub authentication' as IResponseMessage, 500));
  }
};

export const githubAuthCallback = catchAsync(
  async (req: Request<{}, {}, {}, IOAuthCallbackQuery>, res: Response, next: NextFunction) => {
    const code = req.query.code;

    if (!code) {
      return next(
        new ApiError('GitHub Authorization code is missing' as IResponseMessage, 400, ErrorCodes.CLIENT.BAD_REQUEST)
      );
    }

    try {
      // Exchange code for access token
      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: GITHUB_CLIENT_ID,
          client_secret: GITHUB_CLIENT_SECRET,
          code,
        },
        { headers: { Accept: 'application/json' } }
      );

      if (!tokenResponse?.data?.access_token) {
        return next(new ApiError('Failed to retrieve access token from GitHub' as IResponseMessage, 500));
      }

      const accessToken = tokenResponse.data.access_token;

      // Fetch user details
      const userResponse = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'StudenHub',
        },
      });

      if (!userResponse?.data) {
        return next(new ApiError('Failed to retrieve user data from GitHub' as IResponseMessage, 500));
      }

      const { avatar_url: githubPicture, url: githubUrl, name, email } = userResponse.data;

      let user = await User.findFullUser({ email });

      if (user) {
        user.githubAccount = true;
        user.github_url = githubUrl;
        await user.save();
      } else {
        let firstName = '';
        let lastName = '';

        if (name?.includes(' ')) {
          [firstName, lastName] = name.split(' ');
        } else {
          firstName = name || 'GitHub User';
        }

        user = await User.create({
          firstName,
          lastName,
          email,
          githubAccount: true,
          github_url: githubUrl,
        });
      }

      const redirectUrl = user.isAdditionalInfoFilled();
      createSendToken(user, 200, res, {
        ...(redirectUrl && { redirectUrl }),
      });
    } catch (error) {
      console.error('GitHub Authentication Error:', error);
      next(new ApiError('GitHub authentication failed. Please try again.' as IResponseMessage, 500));
    }
  }
);
