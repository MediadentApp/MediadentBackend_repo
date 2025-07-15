import { BannedIP } from '#src/models/BannedIP.model.js';
import redisConnection from '#src/redis.js';

export const loadBannedIPsToRedis = async () => {
  const bans = await BannedIP.find({}, { ip: 1, banNetwork: 1 }).lean();
  const pipeline = redisConnection.multi();

  for (const entry of bans) {
    if (entry.banNetwork) {
      const subnet = entry.ip.split('.').slice(0, 3).join('.');
      pipeline.sadd('banned_subnets', subnet);
    } else {
      pipeline.sadd('banned_ips', entry.ip);
    }
  }

  await pipeline.exec();
  console.log(`✅ Loaded ${bans.length} banned IPs and subnets into Redis`);
};
