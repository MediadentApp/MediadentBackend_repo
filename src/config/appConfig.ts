const appConfig = {
  allowedOrigins: ['http://localhost:3000', 'http://192.168.0.155:3000', 'https://studenthub-mauve.vercel.app'],
  bycryptHashSalt: 10,
  otp: {
    sendOtpAfter: 30, // in seconds
    otpExpiration: 10, // in minutes
  },
  database: {
    host: 'localhost',
    port: 27017,
    dbName: 'myapp',
  },
  apiKey: 'your-api-key',
  urls: {
    signupAdditionalDetailsUrl: '/userdetails',
    signupInterestUrl: '/interests',
    loginUrl: '/login',
  },
  app: {
    signup: {
      minPasswordLength: 8,
      numOfSignupInterests: 3,
    },
    post: {
      allowedPostsPerUser: 5,
      allowedPostImagesPerPost: 5,
      allowedPostsImageType: /jpeg|jpg|png/,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      postsMaxImageSize: 2 * 1024 * 1024, // 2MB
    },
  },
  chat: {
    DEFAULT_MESSAGES_PER_PAGE: 25,
  },
  notification: {
    NOTIFICATION_TIMEOUT_DELAY: 800,
    READ_NOTIFICATION_BATCH_THRESHOLD: 5,
    DELETE_NOTIFICATION_BATCH_THRESHOLD: 5,
  },
} as const;

export default appConfig;
