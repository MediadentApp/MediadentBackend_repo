import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import { IUser } from '#src/types/model.js';
import { IResponseExtra } from '#src/types/api.response.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';
import appConfig from '#src/config/appConfig.js';

const signToken = (id: string): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN as StringValue;
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn,
  });
};

const createSendToken = (user: IUser, statusCode: number, res: Response, options: IResponseExtra = {}) => {
  if (!user || !user?._id) {
    throw new ApiError(responseMessages.GENERAL.SERVER_ERROR, 404, ErrorCodes.GENERAL.FAIL);
  }

  const token = signToken(user._id.toString());

  // Remove password before sending
  user.password = undefined;

  // Set token as a secure, httpOnly cookie
  res.cookie('token', token, {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    // 'lax' allows the cookie to be sent with same-site requests and top-level navigation
    // 'strict' ensures the cookie is only sent to the same site
    // 'none' allows the cookie to be sent with cross-site requests
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: appConfig.app.signup.cookieExpiresIn,
  });

  const extraData: IResponseExtra = {
    ...options,
    authenticated: true,
  };

  if (options.redirectUrl) {
    extraData.redirectUrl = options.redirectUrl;
  }

  return ApiResponse(res, statusCode, options?.message ?? responseMessages.GENERAL.SUCCESS, { user }, extraData);
};

export { signToken, createSendToken };
