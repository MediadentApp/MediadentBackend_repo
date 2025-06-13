import cors from 'cors';
import appConfig from '../config/appConfig.js';
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin ||
            appConfig.allowedOrigins.includes(origin) ||
            (process.env.NODE_ENV === 'development' && /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(origin))) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
export default cors(corsOptions);
