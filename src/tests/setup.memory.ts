import '#src/../loadenv.js';
import './setup.redis.js';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterEach, afterAll, beforeEach } from 'vitest';
import seedDatabase from '#src/tests/seeds.js';

let mongo: MongoMemoryServer | null = null;
process.env.DEBUG = 'mongodb-memory-server*';

beforeAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();

  console.log('✅ Test In-Memory Database Connected');

  await seedDatabase();
});

// afterEach(async () => {
//   await mongoose.connection.dropDatabase();
// });

// Clean up database before each test
// beforeEach(async () => {
//   const collections = mongoose.connection.collections;
//   for (const key in collections) {
//     await collections[key].deleteMany({});
//   }
// });

afterAll(async () => {
  await mongoose.connection.close();
  if (mongo) {
    await mongo.stop();
  }
});
