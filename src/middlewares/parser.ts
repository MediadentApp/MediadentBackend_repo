import express, { NextFunction, Request, Response } from 'express';

const parser = express();

parser.use(express.json());

// parser.use(express.urlencoded({ extended: true }));

// Ensure body is always present
parser.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body === undefined) {
    req.body = {};
  }
  next();
});

export default parser;
