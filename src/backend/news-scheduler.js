/**
 * 新闻自动抓取调度器
 * 定时自动抓取最新新闻
 */

const newsService = require('./news-service');

class NewsScheduler {
  constructor() {
    this.interval = 30 * 60 * 1000; // 30分钟抓取一次
    this.timer = null;
    this.isRunning = false;
  }

  /**
   * 立即抓取一次新闻
   */
  async fetchNow() {
    console.log('[调度器] 手动触发新闻抓取...');
    try {
      const news = await newsService.getLatestNews();
      console.log(`[调度器] 抓取完成，获取 ${news.length} 条新闻`);
      return news;
    } catch (error) {
      console.error('[调度器] 抓取失败:', error.message);
      throw error;
    }
  }

  /**
   * 启动定时抓取
   */
  start(intervalMinutes = 30) {
    if (this.isRunning) {
      console.log('[调度器] 已经在运行中');
      return;
    }

    this.interval = intervalMinutes * 60 * 1000;
    console.log(`[调度器] 启动定时抓取，间隔: ${intervalMinutes} 分钟`);

    // 立即抓取一次
    this.fetchNow().catch(err => {
      console.error('[调度器] 首次抓取失败:', err.message);
    });

    // 设置定时任务
    this.timer = setInterval(async () => {
      console.log(`[调度器] 定时任务触发 (${new Date().toLocaleString('zh-CN')})`);
      try {
        await this.fetchNow();
      } catch (error) {
        console.error('[调度器] 定时抓取失败:', error.message);
      }
    }, this.interval);

    this.isRunning = true;
  }

  /**
   * 停止定时抓取
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.isRunning = false;
      console.log('[调度器] 定时抓取已停止');
    }
  }

  /**
   * 获取下次抓取时间
   */
  getNextFetchTime() {
    if (!this.isRunning) {
      return null;
    }
    return new Date(Date.now() + this.interval);
  }
}

module.exports = new NewsScheduler();
