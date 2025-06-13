import multer from 'multer';
const upload = multer().none();
const multerMiddleware = (req, res, next) => {
    if (req.is('multipart/form-data')) {
        upload(req, res, next);
    }
    else {
        next();
    }
};
export default multerMiddleware;
