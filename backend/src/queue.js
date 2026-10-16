import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from './config/env.js';

export const connection = new IORedis({ ...env.redis, maxRetriesPerRequest: null });

export const queues = {
  dispatch: new Queue('dispatch', { connection }),
  inapp: new Queue('inapp', { connection }),
  email: new Queue('email', { connection }),
  push: new Queue('push', { connection }),
};

export const jobOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 2000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};
