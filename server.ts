import './loadenv.js';

// import settings
import './appSettings.js';

import mongoose, { MongooseError } from 'mongoose';

import { server } from '#src/app.js';

const DB = process.env.NODE_ENV === 'production' ? process.env.DATABASE : process.env.TEST_DATABASE1;
const DB_URI = DB?.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || '');
if (!DB_URI) {
  throw new Error('Database connection string is missing.');
}

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(DB_URI as string);
    console.log(process.env.NODE_ENV, 'database connected successfully');
  } catch (error) {
    console.error('Database connection failed', error);
    throw new MongooseError('Database connection failed');
  }
}
connectDB();

// Start the server
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const HOST = '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server is running on http://${HOST}:${PORT}`);
});
