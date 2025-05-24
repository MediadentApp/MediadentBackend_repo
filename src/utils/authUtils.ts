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

/**
 * Creates a JWT token with the given id, which is typically the user's ObjectId
 * @param {string} id the id to sign into the token
 * @returns {string} the signed token
 */
export const signToken = (id: string): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN as StringValue;
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn,
  });
};

/**
 * Parses a given cookie header string with 's:' prefix and a sinature at last secment and returns a map of the cookies.
 * @param {string} cookieHeader the cookie header string to parse
 * @returns {Record<string, string>} the parsed cookies, with key as the cookie name and value as the cookie value
 */
export function extractSignedCookie(cookieHeader: string): Record<string, string> {
  return Object.fromEntries(
    cookieHeader.split(';').map((cookie) => {
      const [key, val] = cookie.trim().split('=').map((str) => decodeURIComponent(str));

      // Remove 's:' prefix if present
      let value = val.startsWith('s:') ? val.slice(2) : val;

      // If token has 4 parts (due to signature of httpOnly-cookie), remove the signature
      const parts = value.split('.');
      if (parts.length === 4) {
        value = parts[0] + '.' + parts[1] + '.' + parts[2]
      };

      return [key, value]
    })
  );
}

const cookieConfig = {
  signed: true,
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
  // 'lax' allows the cookie to be sent with same-site requests and top-level navigation
  // 'strict' ensures the cookie is only sent to the same site
  // 'none' allows the cookie to be sent with cross-site requests
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  maxAge: appConfig.app.signup.cookieExpiresIn,
};

export const createSendToken = (user: IUser, statusCode: number, res: Response, options: IResponseExtra = {}) => {
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

export const sendDeleteToken = (res: Response) => {
  res.cookie('token', '', {
    signed: true,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 0,
  });

  return ApiResponse(res, 200, responseMessages.AUTH.LOGOUT_SUCCESS);
};

