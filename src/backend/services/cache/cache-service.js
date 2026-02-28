/**
 * Cache Service
 * 内存缓存服务
 *
 * 功能:
 * 1. 决策结果缓存（避免重复计算）
 * 2. 评分结果缓存
 * 3. 市场数据缓存
 * 4. TTL自动过期
 */

class CacheService {
  constructor() {
    this.cache = new Map();
    this.defaults = {
      ttl: {
        SHORT: 5 * 60 * 1000,      // 5分钟
        MEDIUM: 15 * 60 * 1000,    // 15分钟
        LONG: 60 * 60 * 1000,      // 1小时
        VERY_LONG: 24 * 60 * 60 * 1000  // 24小时
      }
    };

    // 定期清理过期缓存
    this.startCleanup();
  }

  /**
   * 生成缓存键
   */
  generateKey(prefix, params) {
    const paramStr = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${prefix}:${paramStr}`;
  }

  /**
   * 设置缓存
   */
  set(key, value, ttl = this.defaults.ttl.MEDIUM) {
    const expireTime = Date.now() + ttl;
    this.cache.set(key, {
      value: value,
      expireTime: expireTime
    });
  }

  /**
   * 获取缓存
   */
  get(key) {
    const item = this.cache.get(key);

    if (!item) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > item.expireTime) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * 删除缓存
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear() {
    this.cache.clear();
  }

  /**
   * 批量删除缓存（支持模式匹配）
   */
  deletePattern(pattern) {
    const keys = Array.from(this.cache.keys());
    keys.forEach(key => {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    });
  }

  /**
   * 获取缓存统计
   */
  getStats() {
    const now = Date.now();
    let validCount = 0;
    let expiredCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expireTime) {
        expiredCount++;
      } else {
        validCount++;
      }
    }

    return {
      total: this.cache.size,
      valid: validCount,
      expired: expiredCount,
      size: JSON.stringify(Array.from(this.cache.values())).length
    };
  }

  /**
   * 定期清理过期缓存
   */
  startCleanup() {
    // 每5分钟清理一次
    setInterval(() => {
      const now = Date.now();
      let cleaned = 0;

      for (const [key, item] of this.cache.entries()) {
        if (now > item.expireTime) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`[缓存] 清理了 ${cleaned} 个过期项`);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * 获取或设置（模式）
   */
  async getOrSet(key, factory, ttl = this.defaults.ttl.MEDIUM) {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }

  /**
   * 缓存决策结果
   */
  cacheDecision(stockCode, decision) {
    const key = this.generateKey('decision', { stockCode });
    this.set(key, decision, this.defaults.ttl.SHORT);
  }

  /**
   * 获取缓存的决策
   */
  getCachedDecision(stockCode) {
    const key = this.generateKey('decision', { stockCode });
    return this.get(key);
  }

  /**
   * 缓存评分结果
   */
  cacheScore(stockCode, score) {
    const key = this.generateKey('score', { stockCode });
    this.set(key, score, this.defaults.ttl.MEDIUM);
  }

  /**
   * 获取缓存的评分
   */
  getCachedScore(stockCode) {
    const key = this.generateKey('score', { stockCode });
    return this.get(key);
  }

  /**
   * 缓存市场数据
   */
  cacheMarketData(stockCode, data) {
    const key = this.generateKey('market', { stockCode });
    this.set(key, data, this.defaults.ttl.LONG);
  }

  /**
   * 获取缓存的市场数据
   */
  getCachedMarketData(stockCode) {
    const key = this.generateKey('market', { stockCode });
    return this.get(key);
  }

  /**
   * 清除股票相关缓存
   */
  clearStockCache(stockCode) {
    this.deletePattern(`decision:${stockCode}`);
    this.deletePattern(`score:${stockCode}`);
    this.deletePattern(`market:${stockCode}`);
  }
}

// 导出单例
module.exports = new CacheService();
