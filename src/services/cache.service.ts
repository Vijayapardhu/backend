import redis from '../config/redis';
import { logger } from '../utils/logger.util';

class CacheService {
  private prefix = 'hosthaven:';

  private TTL = {
    PROPERTY_DETAIL: 3600,
    PROPERTY_LIST: 300,
    USER_SESSION: 86400,
    SEARCH_RESULTS: 180,
    FEATURED_PROPERTIES: 1800,
    CITY_LIST: 86400,
    STATE_TOKEN: 600, // 10 minutes for OAuth state
  };

  keys = {
    property: (id: string) => `${this.prefix}property:${id}`,
    propertyList: (params: string) => `${this.prefix}properties:list:${params}`,
    userSession: (userId: string) => `${this.prefix}session:${userId}`,
    searchResults: (query: string) => `${this.prefix}search:${query}`,
    stateToken: (token: string) => `${this.prefix}state:${token}`,
  };

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      logger.error({ error, key }, 'Cache get error');
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redis.setex(key, ttl, serialized);
      } else {
        await redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache set error');
      return false;
    }
  }

  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error({ error, key }, 'Cache del error');
      return false;
    }
  }

  async invalidate(pattern: string): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
      return keys.length;
    } catch (error) {
      logger.error({ error, pattern }, 'Cache invalidate error');
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error({ error, key }, 'Cache exists error');
      return false;
    }
  }

  async setWithExpiry(key: string, value: any, seconds: number): Promise<boolean> {
    return this.set(key, value, seconds);
  }

  getTTL() {
    return this.TTL;
  }
}

export const cacheService = new CacheService();
export default cacheService;
