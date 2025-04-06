import { Response } from 'express';
import jwt from 'jsonwebtoken';

import { IUser } from '../models/userModel';

const signToken = (id: string): string =>
  jwt.sign({ id }, process.env.JWT_SECRET as string, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

interface TokenOptions {
  redirectUrl?: string | null;
}

const createSendToken = (
  user: IUser,
  statusCode: number,
  res: Response,
  options: TokenOptions = {},
): void => {
  const token = signToken(user._id.toString());

  // Remove password from output
  user.password = undefined;

  // Build the response object
  const response: Record<string, any> = {
    status: 'success',
    code: statusCode,
    token,
    data: { user },
  };

  // Conditionally add redirectUrl if provided
  if (options.redirectUrl) {
    response.redirectUrl = options.redirectUrl;
  }

  res.status(statusCode).json(response);
};

export { signToken, createSendToken };
