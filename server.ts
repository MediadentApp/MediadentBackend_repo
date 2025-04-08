import './loadEnv';

import mongoose, { MongooseError } from 'mongoose';

import { server } from '#src/app.js';

// Ensure required environment variables exist
const DB_URI = process.env.DATABASE?.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || '');
if (!DB_URI) {
  throw new Error('Database connection string is missing.');
}

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect(DB_URI as string);
    console.log('Database connected successfully');
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
