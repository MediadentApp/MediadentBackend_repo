import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

import AppError from '#src/utils/appError.js';
import fieldsToSanitize from '#src/config/sanitization.js';

export default function sanitizeBody(req: Request, res: Response, next: NextFunction): void {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    // Apply sanitization to specified fields
    Object.keys(fieldsToSanitize).forEach(field => {
      if (req?.body[field]) {
        const sanitizer = validator[fieldsToSanitize[field]] as (input: string) => string;
        req.body[field] = sanitizer(req?.body[field]);
      }
    });

    // Validate OTP (ensure it's numeric)
    if (req?.body?.otp) {
      if (!validator.isNumeric(req?.body.otp.toString())) {
        return next(new AppError('OTP should contain only numeric characters', 400));
      }
    }

    // Validate password (ensure it contains only alphanumeric characters)
    if (req?.body?.password) {
      req.body.password = validator.trim(req?.body.password);

      if (!validator.isAlphanumeric(req?.body.password)) {
        return next(new AppError('Password should only contain alphanumeric characters', 400));
      }
    }

    return next();
  } catch (err) {
    console.log('Error sanitizing request body:', err);
    return next(new AppError('Client error: could not sanitize request body', 400));
  }
}
