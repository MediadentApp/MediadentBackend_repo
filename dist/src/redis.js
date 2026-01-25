import { Redis } from 'ioredis';
if (!process.env.REDIS_URL) {
    throw new Error('❌ REDIS_URL not defined');
}
const redisConnection = new Redis(process.env.REDIS_URL, {
    // tls: {
    //   servername: 'redis-13788.c305.ap-south-1-1.ec2.redns.redis-cloud.com',
    // },
    connectTimeout: 10_000,
    maxRetriesPerRequest: null,
    // Exponential backoff (prevents spam)
    retryStrategy(times) {
        if (times > 8)
            return null;
        return Math.min(1000 * 2 ** times, 30_000);
    },
    // Retry only for real network/DNS failures
    reconnectOnError(err) {
        const nodeErr = err;
        return nodeErr?.code === 'ENOTFOUND' || nodeErr?.code === 'ECONNREFUSED' || nodeErr?.code === 'ETIMEDOUT';
    },
});
redisConnection.on('connect', () => {
    console.log('✅ Connected to Redis');
});
redisConnection.on('error', err => {
    console.error('❌ Redis connection error:', err);
});
export default redisConnection;
