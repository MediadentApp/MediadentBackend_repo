import './loadenv.js';

import { mountBullBoard, server } from '#src/app.js';
import { loadBannedIPsToRedis } from '#src/services/initBannedIPsToRedis.js';
import { connectRedis } from '#src/config/redis.js';
import { initQueues } from '#src/jobs/queues/index.js';
import { initWorkders } from '#src/jobs/workers/index.js';
import { initScheduledJobs } from '#src/jobs/scheduled/index.js';
import { initBullBoard } from '#src/jobs/admin.js';
import { connectRabbitMQ } from '#src/config/rabbit.js';
import { initPublisher } from '#src/messaging/publisher.js';
import { connectDB } from '#src/config/mongo.js';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const HOST = '0.0.0.0';

async function bootstrap() {
  try {
    await Promise.all([connectDB(), connectRedis(), connectRabbitMQ()]);

    initPublisher();

    // Initialize queues
    initQueues();
    initWorkders();

    await initScheduledJobs();

    initBullBoard();
    mountBullBoard();

    await loadBannedIPsToRedis();

    server.listen(PORT, HOST, () => {
      console.log(`Server running on http://${HOST}:${PORT}`);
    });
  } catch (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
  }
}

bootstrap();
