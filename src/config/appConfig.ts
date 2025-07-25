const appConfig = {
  allowedOrigins: ['http://localhost:3000', 'http://192.168.0.155:3000', 'https://studenhub-mauve.vercel.app'],
  allowedIps: ['127.0.0.1', '::1', 'localhost', '103.107.126'] as string[],
  // allowedIps: [''] as string[],
  skipRoutes: ['/api/v1/health', '/favicon.ico', '/'] as string[],
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
      passwordResetTokenExpiration: 10 * 60 * 1000, // 10 mins
      cookieExpiresIn: 5 * 24 * 60 * 60 * 1000, // 5 days
    },
    algoRecommendation: {
      postPopularity: {
        dailyCalcTimePattern: '0 0 */1 * * *', // At second 0, minute 0, every hour, every day, every month, every day of the week
        hourlyCalcTimePattern: '0 30,00 * * * *', // At 00 and 30 minutes past every hour
        thresholdDate: 30 * 24 * 60 * 60 * 1000, // 30 days
      },
      postViewCleanup: {
        dailyCleanTimePattern: '0 0 16 * * *',
      },
      refreshPosts: {
        hourlyRefreshTimePattern: '0 29,59 * * * *', // At 29 and 59 minutes past every hour
      },
    },
    post: {
      allowedPostsPerUser: 30,
      allowedPostImagesPerPost: 5,
      allowedPostsImageType: /jpeg|jpg|png/,
      allowedMimeTypes: ['image/jpeg', 'image/png'],
      postsMaxImageSize: 2 * 1024 * 1024, // 2MB
      postViewExpiry: 7 * 24 * 60 * 60 * 1000, // 1 week
      PostViewCleanupInterval: 24 * 60 * 60 * 1000, // 24 hrs, must be in milliseconds
    },
  },
  defaultDebounceExecutionFlushDelay: 50, // ms
  defaultDebounceExecutionMaxOperations: 200,
  defaultDebounceMongoBatchExecutionFlushDelay: 300, // ms
  defaultDebounceMongoBatchExecutionMaxOperations: 300,
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
