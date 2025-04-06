import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

import AppError from '@src/utils/appError';

// Define a type for sanitization methods available in the validator package
type SanitizeMethods = keyof typeof validator;

// Define fields and their corresponding validator methods
const fieldsToSanitize: Record<string, SanitizeMethods> = {
  firstName: 'escape',
  lastName: 'escape',
  email: 'normalizeEmail',
  userId: 'escape',
  userBid: 'escape',
  userAId: 'escape',
  bio: 'escape',
};

export default function sanitizeBody(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    // Apply sanitization to specified fields
    Object.keys(fieldsToSanitize).forEach((field) => {
      if (req.body[field]) {
        req.body[field] = validator[fieldsToSanitize[field]](req.body[field]);
      }
    });

    // Validate OTP (ensure it's numeric)
    if (req.body.otp) {
      if (!validator.isNumeric(req.body.otp.toString())) {
        return next(
          new AppError('OTP should contain only numeric characters', 400),
        );
      }
    }

    // Validate password (ensure it contains only alphanumeric characters)
    if (req.body.password) {
      req.body.password = validator.trim(req.body.password);

      if (!validator.isAlphanumeric(req.body.password)) {
        return next(
          new AppError(
            'Password should only contain alphanumeric characters',
            400,
          ),
        );
      }
    }

    return next();
  } catch (err) {
    return next(
      new AppError('Client error: could not sanitize request body', 400),
    );
  }
}
