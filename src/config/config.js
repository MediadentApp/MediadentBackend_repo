module.exports = {
  otp: {
    sendOtpAfter: 2,
    otpExpiration: 10
  },
  database: {
    host: 'localhost',
    port: 27017,
    dbName: 'myapp'
  },
  apiKey: 'your-api-key',
  urls: {
    signupAdditionalDetailsUrl: '/additionalinfo',
    signupInterestUrl: '/interest'
  },
  app: {
    numOfSignupInterests: 5
  },
  chat: {
    DEFAULT_MESSAGES_PER_PAGE: 25
  }
};
