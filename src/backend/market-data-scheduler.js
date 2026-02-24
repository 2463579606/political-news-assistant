/**
 * 市场数据定时更新调度器
 * 自动定时刷新市场数据，确保数据的实时性
 */

const realTimeMarketService = require('./real-time-market-service');

class MarketDataScheduler {
  constructor() {
    this.timers = new Map();
    this.isRunning = false;
    this.lastUpdateLog = [];
  }

  /**
   * 启动定时更新
   */
  start() {
    if (this.isRunning) {
      console.log('调度器已在运行中');
      return;
    }

    this.isRunning = true;
    console.log('[调度器] 启动市场数据自动更新...');

    // 指数数据 - 每30秒更新
    this.scheduleUpdate('指数', 30000, async () => {
      try {
        const data = await realTimeMarketService.getAllIndices();
        this.log('指数', 'success', `更新成功，共${data.all?.length || 0}个指数`);
        return data;
      } catch (error) {
        this.log('指数', 'error', error.message);
        throw error;
      }
    });

    // 板块数据 - 每1分钟更新
    this.scheduleUpdate('板块', 60000, async () => {
      try {
        const data = await realTimeMarketService.getHotSectors();
        this.log('板块', 'success', `更新成功，共${data.sectors?.length || 0}个板块`);
        return data;
      } catch (error) {
        this.log('板块', 'error', error.message);
        throw error;
      }
    });

    // 市场统计 - 每1分钟更新
    this.scheduleUpdate('统计', 60000, async () => {
      try {
        const data = await realTimeMarketService.getMarketStats();
        this.log('统计', 'success', `更新成功，上涨${data.riseCount}家`);
        return data;
      } catch (error) {
        this.log('统计', 'error', error.message);
        throw error;
      }
    });

    // 市场情绪 - 每1分钟更新
    this.scheduleUpdate('情绪', 60000, async () => {
      try {
        const data = await realTimeMarketService.getMarketSentiment();
        this.log('情绪', 'success', `情绪指数${data.sentimentScore}`);
        return data;
      } catch (error) {
        this.log('情绪', 'error', error.message);
        throw error;
      }
    });

    console.log('[调度器] 所有任务已启动');
  }

  /**
   * 调度单个任务
   */
  scheduleUpdate(name, interval, task) {
    // 立即执行一次
    task().catch(err => console.error(`[调度器] ${name} 首次执行失败:`, err.message));

    // 设置定时任务
    const timer = setInterval(() => {
      task().catch(err => console.error(`[调度器] ${name} 执行失败:`, err.message));
    }, interval);

    this.timers.set(name, {
      timer,
      interval,
      lastRun: null,
      nextRun: Date.now() + interval
    });

    console.log(`[调度器] ${name} - 每${interval/1000}秒更新`);
  }

  /**
   * 记录更新日志
   */
  log(type, status, message) {
    const logEntry = {
      type,
      status,
      message,
      timestamp: new Date().toISOString()
    };

    this.lastUpdateLog.unshift(logEntry);

    // 只保留最近100条日志
    if (this.lastUpdateLog.length > 100) {
      this.lastUpdateLog.pop();
    }

    console.log(`[调度器] ${type} - ${status}: ${message}`);
  }

  /**
   * 停止调度器
   */
  stop() {
    console.log('[调度器] 停止所有定时任务...');

    for (const [name, task] of this.timers.entries()) {
      clearInterval(task.timer);
      console.log(`[调度器] 已停止: ${name}`);
    }

    this.timers.clear();
    this.isRunning = false;

    console.log('[调度器] 已停止');
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    const tasks = {};
    const now = Date.now();

    for (const [name, task] of this.timers.entries()) {
      tasks[name] = {
        interval: task.interval / 1000 + 's',
        lastRun: task.lastRun ? new Date(task.lastRun).toISOString() : 'N/A',
        nextRun: task.nextRun ? new Date(task.nextRun).toISOString() : 'N/A',
        timeToNext: task.nextRun ? Math.round((task.nextRun - now) / 1000) + 's' : 'N/A'
      };
    }

    return {
      isRunning: this.isRunning,
      tasks: tasks,
      recentLogs: this.lastUpdateLog.slice(0, 10),
      cacheStatus: realTimeMarketService.getCacheStatus()
    };
  }

  /**
   * 手动触发更新
   */
  async triggerUpdate(type) {
    console.log(`[调度器] 手动触发: ${type}`);

    try {
      switch (type) {
        case '指数':
          return await realTimeMarketService.getAllIndices();
        case '板块':
          return await realTimeMarketService.getHotSectors();
        case '统计':
          return await realTimeMarketService.getMarketStats();
        case '情绪':
          return await realTimeMarketService.getMarketSentiment();
        default:
          throw new Error(`未知的更新类型: ${type}`);
      }
    } catch (error) {
      console.error(`[调度器] 手动触发失败:`, error.message);
      throw error;
    }
  }

  /**
   * 清除缓存并强制更新
   */
  async forceUpdate(type) {
    realTimeMarketService.clearCache(type);
    return await this.triggerUpdate(type);
  }
}

module.exports = new MarketDataScheduler();
