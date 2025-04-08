import morgan from 'morgan';
import express from 'express';

const logger = express();
if (process.env.NODE_ENV === 'development') {
  logger.use(morgan('dev'));
}

export default logger;
