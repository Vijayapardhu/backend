import Redis from 'ioredis';
import { config } from '../config';

const createRedisClient = () => {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => Math.min(times * 100, 3000),
    lazyConnect: true,
  });
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
  : createNoopRedis() as any;

if (config.app.nodeEnv === 'development') {
  globalThis.redis = redis;
}

export default redis;
