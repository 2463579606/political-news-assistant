// ============================================
// Cache Service (Redis)
// ============================================

import Redis from 'ioredis';
import { env } from './config';

class CacheService {
  private client: Redis | null = null;

  constructor() {
    try {
      this.client = new Redis(env.REDIS_URL);
      console.log('Redis connected successfully');
    } catch (error) {
      console.error('Redis connection failed, cache disabled:', error);
    }
  }

  // 获取缓存
  async get<T>(key: string): Promise<T | null> {
    if (!this.client) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // 设置缓存
  async set(key: string, value: unknown, ttl?: string | number): Promise<void> {
    if (!this.client) return;

    try {
      const strValue = JSON.stringify(value);
      if (ttl) {
        await this.client.setex(key, this.parseTTL(ttl), strValue);
      } else {
        await this.client.set(key, strValue);
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  // 删除缓存
  async del(key: string): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  // 清除匹配模式的缓存
  async delPattern(pattern: string): Promise<void> {
    if (!this.client) return;

    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(...keys);
      }
    } catch (error) {
      console.error('Cache delPattern error:', error);
    }
  }

  // TTL 解析 (支持 '5m', '1h', '24h' 等格式)
  private parseTTL(ttl: string | number): number {
    if (typeof ttl === 'number') return ttl;

    const match = ttl.match(/^(\d+)([smhd])$/);
    if (!match) return 300; // 默认5分钟

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    switch (unit) {
      case 's': return num;
      case 'm': return num * 60;
      case 'h': return num * 3600;
      case 'd': return num * 86400;
      default: return 300;
    }
  }

  // 限流
  async limit(key: string, limit: number, window: number): Promise<boolean> {
    if (!this.client) return true;

    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, window);
      }
      return current <= limit;
    } catch {
      return true;
    }
  }

  // 关闭连接
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

// 单例导出
export const cache = new CacheService();
