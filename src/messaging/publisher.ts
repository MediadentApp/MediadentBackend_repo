import rabbitConnection from '#src/config/rabbit.js';
import { Publisher } from 'rabbitmq-client';

let publisher: Publisher | null = null;

async function initPublisher() {
  if (publisher) return; // Already initialized

  const connection = await rabbitConnection();
  publisher = connection.createPublisher({
    confirm: true,
    exchanges: [
      // ✅ Define exchange here
      {
        exchange: 'interview.event',
        type: 'topic',
        durable: true,
      },
    ],
  });
}

async function publishEvent(exchange: string, routingKey: string, data: any) {
  if (!publisher) {
    await initPublisher();
  }

  await publisher!.send(
    {
      exchange: exchange,
      routingKey: routingKey,
    },
    Buffer.from(JSON.stringify(data))
  );
}

export { initPublisher, publishEvent };

// Initialize on module load
initPublisher().catch(console.error);
