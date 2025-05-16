import { Redis } from 'ioredis';

if (!process.env.REDIS_URL) {
  throw new Error('❌ REDIS_URL not defined');
}

const redis = new Redis(process.env.REDIS_URL, {
  // tls: {
  //   servername: 'redis-13788.c305.ap-south-1-1.ec2.redns.redis-cloud.com',
  // },
  maxRetriesPerRequest: null,
});

redis.on('connect', () => {
  console.log('✅ Connected to Redis');
});

redis.on('error', err => {
  console.error('❌ Redis connection error:', err);
});

export default redis;
