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

    if (req.body.otp) {
      req.body.otp = validator.trim(req.body.otp);
      if (!validator.isNumeric(req.body.otp)) {
        return res.status(400).json({ message: 'OTP should contain only numeric characters' });
      }
    }

    if (req.body.password) {
      req.body.password = validator.trim(req.body.password);

      if (validator.contains(req.body.password, /[^\da-zA-Z]/)) {
        return res.status(400).json({ message: 'Password should only contain alphanumeric characters' });
      }
    }

    next();
  } catch (err) {
    next(new AppError('Client error: could not sanitize request body', 400));
  }
};
