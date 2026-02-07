import morgan from 'morgan';
import express from 'express';

const logger = express();

logger.use(morgan(process.env.NODE_ENV === 'production' ? 'tiny' : 'dev'));

export default logger;
