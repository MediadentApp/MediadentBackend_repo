import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import { IUser } from '#src/types/model.js';
import { IResponseExtra } from '#src/types/response.message.js';
import ApiError from '#src/utils/ApiError.js';
import ApiResponse from '#src/utils/ApiResponse.js';
import { Response } from 'express';
import jwt from 'jsonwebtoken';
import type { StringValue } from 'ms';

const signToken = (id: string): string => {
  const expiresIn = process.env.JWT_EXPIRES_IN as StringValue;
  return jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn,
  });
};

interface TokenOptions {
  redirectUrl?: string | null;
}

const createSendToken = (user: IUser, statusCode: number, res: Response, options: TokenOptions = {}) => {
  if (!user || !user?._id) {
    throw new ApiError(responseMessages.GENERAL.SERVER_ERROR, 404, ErrorCodes.GENERAL.FAIL);
  }

  const token = signToken(user?._id.toString());

  // Remove password from output
  user.password = undefined;

  const extraData: IResponseExtra = {
    token,
    authenticated: true,
  };

  // Conditionally add redirectUrl if provided
  if (options.redirectUrl) {
    extraData.redirectUrl = options.redirectUrl;
  }

  return ApiResponse(res, statusCode, responseMessages.GENERAL.SUCCESS, { user: user! }, extraData);
};

export { signToken, createSendToken };
