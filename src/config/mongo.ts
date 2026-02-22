import mongoose, { MongooseError } from 'mongoose';

const isProductionOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';

const useTestDatabase = process.env.USE_TEST_DATABASE !== 'false';

const db_type = isProductionOrStaging || !useTestDatabase ? 'PRODUCTION' : 'TEST';

const DB = isProductionOrStaging || !useTestDatabase ? process.env.DATABASE : process.env.TEST_DATABASE2;

const DB_URI = DB?.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || '');

if (!DB_URI) {
  throw new Error('Database connection string is missing.');
}

export async function connectDB() {
  try {
    await mongoose.connect(DB_URI as string);
    console.log(db_type, 'database connected successfully');
  } catch (error) {
    console.error('Database connection failed', error);
    throw new MongooseError('Database connection failed');
  }
}
