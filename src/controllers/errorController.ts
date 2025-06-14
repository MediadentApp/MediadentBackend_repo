import e, { Request, Response, NextFunction } from 'express';
import { CastError, Error as MongooseError } from 'mongoose';

import ApiError from '#src/utils/ApiError.js';
import { ErrorCodes } from '#src/config/constants/errorCodes.js';
import responseMessages from '#src/config/constants/responseMessages.js';
import { IResponseMessage } from '#src/types/api.response.messages.js';
import { AxiosError } from 'axios';
import appConfig from '#src/config/appConfig.js';
import { formatFileSize } from '#src/utils/index.js';

const handleCastErrorDB = (err: CastError): ApiError => {
  const message = `Invalid ${err.path}: ${err.value}.` as IResponseMessage;
  return new ApiError(message, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
};

export const handleMongoServerError = (
  err: MongooseError & { code: number; keyPattern?: any; keyValue?: any }
): ApiError => {
  // Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const fields = Object.keys(err.keyPattern || {});
    const values = Object.values(err.keyValue || {});
    const fieldList = fields.map((field, idx) => `${field}: "${values[idx]}"`).join(', ');

    const message = `Duplicate value for field(s): ${fieldList}. Please use a different value.` as IResponseMessage;

    return new ApiError(message, 400, ErrorCodes.DATA.ALREADY_EXISTS);
  }

  // Catch-all for other MongoServerErrors
  const message = 'An unknown MongoDB server error occurred.' as IResponseMessage;
  return new ApiError(message, 500, ErrorCodes.SERVER.UNKNOWN_ERROR);
};

const handleMulterError = (err: any): ApiError => {
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ApiError(responseMessages.CLIENT.INVALID_IMAGE_FORMAT_OR_SIZE, 400, ErrorCodes.CLIENT.IMAGE_TOO_LARGE);
  } else if (err.code === 'LIMIT_FILE_SIZE') {
    return new ApiError(
      `Image too large, max size: ${formatFileSize(appConfig.app.post.postsMaxImageSize)}` as IResponseMessage,
      400,
      ErrorCodes.CLIENT.IMAGE_TOO_LARGE
    );
  }
  return new ApiError(err.message, 400, ErrorCodes.SERVER.UNKNOWN_ERROR);
};

const handleAxiosError = (err: AxiosError): ApiError => {
  return new ApiError(responseMessages.GENERAL.SERVER_ERROR, 400, ErrorCodes.SERVER.UNKNOWN_ERROR);
};

const handleDuplicateFieldsDB = (err: MongooseError): ApiError => {
  const match = err.message.match(/(["'])(\\?.)*?\1/);
  const value = match ? match[0] : 'Unknown';

  const message = `Duplicate field value: ${value}. Please use another value!` as IResponseMessage;
  return new ApiError(message, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
};

const handleValidationErrorDB = (err: MongooseError.ValidationError): ApiError => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}` as IResponseMessage;
  return new ApiError(message, 400, ErrorCodes.CLIENT.MISSING_INVALID_INPUT);
};

const handleJwtError = (): ApiError =>
  new ApiError(responseMessages.AUTH.INVALID_TOKEN, 401, ErrorCodes.CLIENT.UNAUTHENTICATED);

const handleJwtExpiredError = (): ApiError =>
  new ApiError(responseMessages.AUTH.TOKEN_EXPIRED, 401, ErrorCodes.CLIENT.UNAUTHENTICATED);

const sendErrorDev = (err: ApiError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    name: err.name,
    errorCode: err.errorCode,
    message: err.message,
    redirectUrl: err.redirectUrl,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err: ApiError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      errorCode: err.errorCode,
      name: err.name,
      message: err.message,
      redirectUrl: err?.redirectUrl ?? null,
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      errorCode: ErrorCodes.SERVER.UNKNOWN_ERROR,
      message: 'Something went very wrong!',
    });
  }
};

const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'Internal Server Error';

  // console.log(`\x1b[33m${err.stack.replace(/\n/g, '\n  ')}\x1b[0m`);
  // console.log('error', err);
  // console.log('errorName', err.name);

  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'test') {
    let error: ApiError = err;

    if (error.name === 'CastError') error = handleCastErrorDB(error as unknown as CastError);
    if (error.name === 'MulterError') error = handleMulterError(error as unknown as CastError);
    if (error.statusCode === 11000) error = handleDuplicateFieldsDB(error);
    // if (error.name === 'MongoServerError') error = handleMongoServerError(error as unknown as MongooseError);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(error as unknown as MongooseError.ValidationError);
    if (error.name === 'JsonWebTokenError') error = handleJwtError();
    // if (error.name === 'TokenExpiredError') error = handleJwtExpiredError();

    sendErrorProd(error, res);
  } else {
    sendErrorDev(err, res);
  }
};

export default globalErrorHandler;
