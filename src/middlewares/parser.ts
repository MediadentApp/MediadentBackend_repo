import express, { NextFunction, Request, Response } from 'express';
import qs from 'qs';

const parser = express();

parser.use(express.json());

parser.use(express.urlencoded({ extended: true }));

// parser.use((req: Request, res: Response, next: NextFunction) => {
//   req.query = qs.parse(req.url.split('?')[1]);
//   next();
// });

// Ensure body is always present
parser.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});

export default parser;
