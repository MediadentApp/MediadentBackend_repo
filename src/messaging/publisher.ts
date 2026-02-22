import { getRabbitMQ } from '#src/config/rabbit.js';
import { Publisher } from 'rabbitmq-client';

let publisher: Publisher | null = null;

/**
 * Initialize publisher (call during bootstrap AFTER connectRabbitMQ)
 */
export function initPublisher() {
  if (publisher) return;

  const connection = getRabbitMQ();

  publisher = connection.createPublisher({
    confirm: true,
    exchanges: [
      {
        exchange: 'interview.event',
        type: 'topic',
        durable: true,
      },
    ],
  });

  console.log('RabbitMQ publisher initialized');
}

/**
 * Publish event
 */
export async function publishEvent(exchange: string, routingKey: string, data: any) {
  if (!publisher) {
    throw new Error('Publisher not initialized');
  }

  await publisher.send(
    {
      exchange,
      routingKey,
    },
    Buffer.from(JSON.stringify(data))
  );
}
