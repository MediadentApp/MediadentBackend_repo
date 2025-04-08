import rateLimit from 'express-rate-limit';
import appConfig from '#src/config/appConfig.js';

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later.',
  headers: true,
  skip: req =>
    !req.headers.origin ||
    appConfig.allowedOrigins.includes(req.headers.origin) ||
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    (process.env.NODE_ENV === 'development' &&
      /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(req.headers.origin || '')),
});

export default generalLimiter;
