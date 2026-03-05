import Redis from 'ioredis';
import { config } from '../config';

const createRedisClient = () => {
  const url = new URL(config.redis.url);

  const client = new Redis({
    host: url.hostname || '127.0.0.1',
    port: Number(url.port) || 6379,
    password: url.password || undefined,
    family: 4, // Force IPv4 to avoid ::1 connection issues
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });

  client.on('connect', () => {
    console.log('Redis connected');
  });

  client.on('error', (err) => {
    console.error('Redis error:', err);
  });

  return client;
};

const createNoopRedis = () => {
  return {
    get: async (_key: string) => null,
    set: async (_key: string, _value: string, ..._args: any[]) => 'OK',
    setex: async (_key: string, _seconds: number, _value: string) => 'OK',
    del: async (..._keys: any[]) => 0,
    keys: async (_pattern: string) => [] as string[],
    exists: async (..._keys: any[]) => 0,
    quit: async () => undefined,
  };
};

declare global {
  // eslint-disable-next-line no-var
  var redis: Redis | undefined;
}

export const redis = config.redis.enabled
  ? globalThis.redis ?? createRedisClient()
  : (createNoopRedis() as any);

if (config.app.nodeEnv === 'development') {
  globalThis.redis = redis;
}

export default redis;