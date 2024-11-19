const AppError = require('@src/utils/appError');
const validator = require('validator');

exports.sanitizeBody = (req, res, next) => {
  try {
    const fieldsToSanitize = {
      firstName: 'escape',
      lastName: 'escape',
      email: 'normalizeEmail',
      userId: 'escape',
      userBid: 'escape',
      userAId: 'escape',
      bio: 'escape',
    };

    Object.keys(fieldsToSanitize).forEach(field => {
      if (req.body[field]) {
        req.body[field] = validator[fieldsToSanitize[field]](req.body[field]);
      }
    });

    // For OTP
    if (req.body.otp) {
      if (isNaN(req.body.otp) || typeof req.body.otp !== 'number') {
        return next(new AppError('OTP should contain only numeric characters', 400));
      }
    }

    // For password
    if (req.body.password) {
      req.body.password = validator.trim(req.body.password);

      if (validator.contains(req.body.password, /[^\da-zA-Z]/)) {
        return next(new AppError('Password should only contain alphanumeric characters', 400));
      }
    }

    next();
  } catch (err) {
    next(new AppError('Client error: could not sanitize request body', 400));
  }
};
