import { IUser } from '#src/types/model.js';
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

const createSendToken = (
  user: IUser,
  statusCode: number,
  res: Response,
  options: TokenOptions = {}
): void => {
  if (!user || !user?._id) return;

  const token = signToken(user?._id.toString());

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
