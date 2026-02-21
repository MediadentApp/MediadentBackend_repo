import cors, { CorsOptions } from 'cors';
import appConfig from '#src/config/appConfig.js';

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (
      !origin ||
      appConfig.allowedOrigins.includes(origin as any) ||
      (process.env.NODE_ENV === 'development' && /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d{1,5}$/.test(origin))
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};

export default cors(corsOptions);
