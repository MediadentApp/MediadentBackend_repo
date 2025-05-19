import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('❌ REDIS_URL not defined');
}

const redisConnection = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redisConnection.on('error', err => {
  console.error('❌ Redis connection error:', err);
});

export default redisConnection;
