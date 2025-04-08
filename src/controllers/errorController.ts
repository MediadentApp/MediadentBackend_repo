import { Request, Response, NextFunction } from 'express';
import { CastError, Error as MongooseError } from 'mongoose';

import AppError from '#src/utils/appError.js';

const handleCastErrorDB = (err: CastError): AppError => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: MongooseError): AppError => {
  const match = err.message.match(/(["'])(\\?.)*?\1/);
  const value = match ? match[0] : 'Unknown';

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (
  err: MongooseError.ValidationError
): AppError => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJwtError = (): AppError =>
  new AppError('Invalid Token. Please log in again.', 401);

const handleJwtExpiredError = (): AppError =>
  new AppError('Your Token has expired. Please log in again.', 401);

const sendErrorDev = (err: AppError, res: Response): void => {
  res.status(err.statusCode).json({
    status: err.status,
    name: err.name,
    message: err.message,
    redirectUrl: err.redirectUrl,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err: AppError, res: Response): void => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(err.redirectUrl && { redirectUrl: err.redirectUrl }),
    });
  } else {
    console.error('ERROR 💥', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'Internal Server Error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error: AppError = err;

    if (error.name === 'CastError')
      error = handleCastErrorDB(error as unknown as CastError);
    if (error.statusCode === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError')
      error = handleValidationErrorDB(
        error as unknown as MongooseError.ValidationError
      );
    if (error.name === 'JsonWebTokenError') error = handleJwtError();
    if (error.name === 'TokenExpiredError') error = handleJwtExpiredError();

    sendErrorProd(error, res);
  }
};

export default globalErrorHandler;
