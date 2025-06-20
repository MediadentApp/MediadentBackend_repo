import { Request, Response, NextFunction } from 'express';

const requestInfo = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const requestTime = new Date().toISOString();
  req.requestTime = requestTime;
  next();
};

export default requestInfo;
