import { IAppConfig } from '#src/types/config.js';

const appConfig: IAppConfig = {
  allowedOrigins: ['http://localhost:3000', 'http://192.168.0.155:3000', 'https://studenthub-mauve.vercel.app'],
  bycryptHashSalt: 10,
  otp: {
    sendOtpAfter: 2,
    otpExpiration: 10,
  },
  database: {
    host: 'localhost',
    port: 27017,
    dbName: 'myapp',
  },
  apiKey: 'your-api-key',
  urls: {
    signupAdditionalDetailsUrl: '/additionalinfo',
    signupInterestUrl: '/interest',
    loginUrl: '/login',
  },
  app: {
    numOfSignupInterests: 3,
  },
  chat: {
    DEFAULT_MESSAGES_PER_PAGE: 25,
  },
  notification: {
    NOTIFICATION_TIMEOUT_DELAY: 800,
    READ_NOTIFICATION_BATCH_THRESHOLD: 5,
    DELETE_NOTIFICATION_BATCH_THRESHOLD: 5,
  },
};

export default appConfig;
