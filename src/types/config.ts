export interface IAppConfig {
  allowedOrigins: string[];
  bycryptHashSalt: number;
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
    loginUrl: string;
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
