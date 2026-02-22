import { Connection } from 'rabbitmq-client';

let rabbit: Connection | null = null;

/**
 * Initialize RabbitMQ connection (call in bootstrap)
 */
export async function connectRabbitMQ(): Promise<Connection> {
  if (!process.env.RABBITMQ_URL) {
    throw new Error('RABBITMQ_URL not defined');
  }

  if (rabbit) return rabbit;

  rabbit = new Connection({
    url: process.env.RABBITMQ_URL,
  });

  rabbit.on('error', err => {
    console.error('RabbitMQ connection error', err);
  });

  rabbit.on('connection', () => {
    console.log('RabbitMQ connection successfully (re)established');
  });

  return rabbit;
}

/**
 * Get existing connection
 */
export function getRabbitMQ(): Connection {
  if (!rabbit) {
    throw new Error('RabbitMQ not initialized. Call connectRabbitMQ() first.');
  }
  return rabbit;
}

/**
 * Graceful shutdown
 */
export async function disconnectRabbitMQ(): Promise<void> {
  if (!rabbit) return;

  await rabbit.close();
  rabbit = null;
  console.log('RabbitMQ disconnected');
}
