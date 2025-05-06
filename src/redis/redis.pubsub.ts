// src/redis/redis.pubsub.ts
import Redis from 'ioredis';

export const redisPublisher = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});

export const redisSubscriber = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
});
