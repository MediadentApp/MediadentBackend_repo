import { Request, Response, NextFunction } from 'express';
import validator from 'validator';

import ApiError from '#src/utils/ApiError.js';
import fieldsToSanitize from '#src/config/sanitization.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import { IResponseMessage } from '#src/types/response.message.js';
import responseMessages from '#src/config/constants/responseMessages.js';

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

    // For email
    if (req.body.email) {
      req.body.email = validator.trim(req.body.email);
      if (!validator.isEmail(req.body.email)) {
        return next(new ApiError(responseMessages.CLIENT.INVALID_EMAIL, 400, ErrorCodes.CLIENT.INVALID_EMAIL));
      }
    }

    // Validate OTP (ensure it's numeric)
    if (req?.body?.otp) {
      if (!validator.isNumeric(req?.body.otp.toString())) {
        return next(new ApiError(responseMessages.CLIENT.INVALID_OTP, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
      }
    }

    // Validate password (ensure it contains only alphanumeric characters)
    // if (req?.body?.password) {
    //   req.body.password = validator.trim(req?.body.password);

    //   if (!validator.isAlphanumeric(req?.body.password)) {
    //     return next(new ApiError('Password should only contain alphanumeric characters', 400));
    //   }
    // }

    return next();
  } catch (err) {
    console.log('Error sanitizing request body:', err);
    return next(
      new ApiError(responseMessages.CLIENT.SANITIZATION_FAILED, 400, ErrorCodes.SERVER.INTERNAL_SERVER_ERROR)
    );
  }
}
