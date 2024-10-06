class AppError extends Error {
  constructor(message, statusCode, redirectUrl = null) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.redirectUrl = redirectUrl;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
