import express from 'express';
const parser = express();
parser.use(express.json({ limit: '1mb' }));
parser.use(express.urlencoded({ extended: true }));
// parser.use((req: Request, res: Response, next: NextFunction) => {
//   req.query = qs.parse(req.url.split('?')[1]);
//   next();
// });
// Ensure body is always present
parser.use((req, res, next) => {
    if (req.body === undefined) {
        req.body = {};
    }
    next();
});
export default parser;
