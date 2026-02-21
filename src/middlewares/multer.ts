import multer from 'multer';
import { Request, Response, NextFunction } from 'express';

const upload = multer().none();

const multerMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.is('multipart/form-data')) {
    upload(req, res, next);
  } else {
    next();
  }
};

export default multerMiddleware;
