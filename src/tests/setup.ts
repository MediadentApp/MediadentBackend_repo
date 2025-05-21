import '#src/../loadenv.js';
import './setup.redis.js';
import seedDatabase from '#src/tests/seeds.js';

import mongoose from 'mongoose';
import { beforeAll, afterAll } from 'vitest';

const DB_URI = process.env.TEST_DATABASE1?.replace('<PASSWORD>', process.env.DATABASE_PASSWORD || '') as string;
// const DB_URI = process.env.TEST_DATABASE2 as string;

if (!DB_URI) {
  console.error('❌ TEST_DATABASE URI is not defined.');
  process.exit(1);
}

export const connectDB = async () => {
  try {
    await mongoose.connect(DB_URI, {
      connectTimeoutMS: 10000, // 10 seconds timeout
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout for server selection
    });
    await mongoose.connection.dropDatabase();
    console.log('✅ Test Database Connected');
  } catch (error) {
    console.error('❌ Database Connection Failed', error);
    process.exit(1);
  }
};

export const disconnectDB = async () => {
  try {
    // await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('🛑 Test Database Disconnected');
  } catch (error) {
    console.error('❌ Database Disconnection Failed', error);
  }
};

// Ensure database is connected before running tests
beforeAll(async () => {
  await connectDB();
  await seedDatabase();
});

// Clean up database before each test
// beforeEach(async () => {
//   const collections = mongoose.connection.collections;
//   for (const key in collections) {
//     await collections[key].deleteMany({});
//   }
// });

// Disconnect after all tests
afterAll(async () => {
  await disconnectDB();
});
