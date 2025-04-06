interface Config {
  otp: {
    sendOtpAfter: number;
    otpExpiration: number;
  };
  database: {
    host: string;
    port: number;
    dbName: string;
  };
  apiKey: string;
  urls: {
    signupAdditionalDetailsUrl: string;
    signupInterestUrl: string;
  };
  app: {
    numOfSignupInterests: number;
  };
  chat: {
    DEFAULT_MESSAGES_PER_PAGE: number;
  };
  notification: {
    NOTIFICATION_TIMEOUT_DELAY: number;
    READ_NOTIFICATION_BATCH_THRESHOLD: number;
    DELETE_NOTIFICATION_BATCH_THRESHOLD: number;
  };
}

const config: Config = {
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
  },
  app: {
    numOfSignupInterests: 5,
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

export default config;
