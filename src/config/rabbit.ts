import { Connection } from 'rabbitmq-client';

if (!process.env.RABBITMQ_URL) {
  throw new Error('❌ RabbitMQ URL not defined');
}

async function rabbitConnection() {
  const rabbit = new Connection({
    url: process.env.RABBITMQ_URL,
  });
  rabbit.on('error', err => {
    console.log('RabbitMQ connection error', err);
  });
  rabbit.on('connection', () => {
    console.log('RabbitMQ connection successfully (re)established');
  });

  return rabbit;
}

export default rabbitConnection;
