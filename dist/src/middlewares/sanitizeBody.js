import validator from 'validator';
import ApiError from '../utils/ApiError.js';
import fieldsToSanitize from '../config/sanitization.js';
import { ErrorCodes } from '../config/constants/errorCodes.js';
import responseMessages from '../config/constants/responseMessages.js';
/**
 * Recursively remove any keys containing `$` or `.` to prevent NoSQL injection.
 */
function sanitizeForMongo(obj) {
    if (typeof obj !== 'object' || obj === null)
        return;
    Object.keys(obj).forEach(key => {
        if (key.includes('$') || key.includes('.')) {
            delete obj[key];
        }
        else {
            sanitizeForMongo(obj[key]); // Recursively sanitize nested objects
        }
    });
}
export default function sanitizeBody(req, res, next) {
    try {
        if (!req.body || typeof req.body !== 'object') {
            console.error('Invalid request body');
            return next();
        }
        // 💥 Protect against NoSQL injection
        sanitizeForMongo(req.body);
        // 🔧 Field-level sanitization
        Object.keys(fieldsToSanitize).forEach(field => {
            if (req.body[field]) {
                const sanitizer = validator[fieldsToSanitize[field]];
                req.body[field] = sanitizer(req.body[field]);
            }
        });
        // 🧹 Email trim + validation
        if (req.body.email) {
            req.body.email = validator.trim(req.body.email);
            if (!validator.isEmail(req.body.email)) {
                return next(new ApiError(responseMessages.CLIENT.INVALID_EMAIL, 400, ErrorCodes.CLIENT.INVALID_EMAIL));
            }
        }
        // 🔐 OTP must be numeric
        if (req.body.otp && !validator.isNumeric(req.body.otp.toString())) {
            return next(new ApiError(responseMessages.CLIENT.INVALID_OTP, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT));
        }
        // Optional: password checks
        // if (req.body.password) {
        //   req.body.password = validator.trim(req.body.password);
        //   if (!validator.isAlphanumeric(req.body.password)) {
        //     return next(new ApiError('Password must be alphanumeric only', 400));
        //   }
        // }
        return next();
    }
    catch (err) {
        console.error('Error sanitizing request body:', err);
        return next(new ApiError(responseMessages.CLIENT.SANITIZATION_FAILED, 400, ErrorCodes.SERVER.INTERNAL_SERVER_ERROR));
    }
}
