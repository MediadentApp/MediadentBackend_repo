import '#src/../loadenv.js';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { beforeAll, afterEach, afterAll } from 'vitest';

let mongo: MongoMemoryServer | null = null;
process.env.DEBUG = 'mongodb-memory-server*';

beforeAll(async () => {
  if (mongo) {
    await mongo.stop();
  }
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
  console.log('✅ Test In-Memory Database Connected');
});

// afterEach(async () => {
//   await mongoose.connection.dropDatabase();
// });

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) {
    await mongo.stop();
  }
});
