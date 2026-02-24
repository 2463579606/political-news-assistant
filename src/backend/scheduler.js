const cron = require('node-cron');
const aiLearningService = require('./ai-learning-service');
const domesticNewsScraper = require('./domestic-news-scraper');
const stockBulletinScraper = require('./stock-bulletin-scraper');

/**
 * 定时任务调度器
 * 负责每日自动执行AI学习任务
 */
class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.isRunning = false;
  }

  /**
   * 启动所有定时任务
   */
  start() {
    if (this.isRunning) {
      console.log('[调度器] 已经在运行中');
      return;
    }

    console.log('[调度器] 启动AI学习调度服务...');

    // 每日新闻学习任务 - 每天6:00, 12:00, 18:00, 22:00执行
    this.scheduleNewsLearning();

    // 每日公告学习任务 - 每天8:00, 20:00执行（早晚各一次）
    this.scheduleBulletinLearning();

    // 每日市场数据记录 - 收盘后15:30执行
    this.scheduleMarketRecording();

    // 每日关联分析 - 16:00执行
    this.scheduleCorrelationAnalysis();

    this.isRunning = true;
    console.log('[调度器] 所有定时任务已启动');
  }

  /**
   * 新闻学习任务
   */
  scheduleNewsLearning() {
    // 每天在6:00, 12:00, 18:00, 22:00执行
    const task = cron.schedule('0 6,12,18,22 * * *', async () => {
      console.log('[调度器] 开始执行新闻学习任务:', new Date().toLocaleString('zh-CN'));

      try {
        // 获取最新新闻
        const news = await domesticNewsScraper.getLatestNews();
        console.log('[调度器] 获取到新闻:', news.length);

        // AI学习
        const eventsExtracted = await aiLearningService.learnFromNews(news);
        console.log('[调度器] 新闻学习完成，提取事件:', eventsExtracted);

      } catch (e) {
        console.error('[调度器] 新闻学习任务失败:', e.message);
      }
    });

    this.tasks.set('news-learning', task);
    console.log('[调度器] ✓ 新闻学习任务已注册 (每天 6:00, 12:00, 18:00, 22:00)');
  }

  /**
   * 公告学习任务
   */
  scheduleBulletinLearning() {
    // 每天在8:00, 20:00执行（早晚各一次）
    const task = cron.schedule('0 8,20 * * *', async () => {
      console.log('[调度器] 开始执行公告学习任务:', new Date().toLocaleString('zh-CN'));

      try {
        // 获取最新公告
        const bulletins = await stockBulletinScraper.getLatestBulletins(null, 100);
        console.log('[调度器] 获取到公告:', bulletins.length);

        // AI学习
        const eventsExtracted = await aiLearningService.learnFromBulletins(bulletins);
        console.log('[调度器] 公告学习完成，提取事件:', eventsExtracted);

      } catch (e) {
        console.error('[调度器] 公告学习任务失败:', e.message);
      }
    });

    this.tasks.set('bulletin-learning', task);
    console.log('[调度器] ✓ 公告学习任务已注册 (每天 8:00, 20:00)');
  }

  /**
   * 市场数据记录任务
   */
  scheduleMarketRecording() {
    // 每天15:30执行（收盘后）
    const task = cron.schedule('30 15 * * 1-5', async () => {
      console.log('[调度器] 开始执行市场数据记录任务:', new Date().toLocaleString('zh-CN'));

      try {
        // 获取市场数据（从现有的市场数据服务）
        const marketData = await this.fetchMarketData();
        console.log('[调度器] 获取市场数据:', JSON.stringify(marketData));

        // 记录到数据库
        await aiLearningService.recordMarketData(marketData);
        console.log('[调度器] 市场数据记录完成');

      } catch (e) {
        console.error('[调度器] 市场数据记录任务失败:', e.message);
      }
    });

    this.tasks.set('market-recording', task);
    console.log('[调度器] ✓ 市场数据记录任务已注册 (周一至周五 15:30)');
  }

  /**
   * 关联分析任务
   */
  scheduleCorrelationAnalysis() {
    // 每天16:00执行
    const task = cron.schedule('0 16 * * *', async () => {
      console.log('[调度器] 开始执行关联分析任务:', new Date().toLocaleString('zh-CN'));

      try {
        const today = new Date().toISOString().split('T')[0];

        // 分析新闻-市场关联
        const correlations = await aiLearningService.analyzeCorrelation(today);
        console.log('[调度器] 关联分析完成，发现关联:', correlations);

      } catch (e) {
        console.error('[调度器] 关联分析任务失败:', e.message);
      }
    });

    this.tasks.set('correlation-analysis', task);
    console.log('[调度器] ✓ 关联分析任务已注册 (每天 16:00)');
  }

  /**
   * 获取市场数据（集成现有服务）
   */
  async fetchMarketData() {
    // TODO: 从现有的市场数据服务获取
    // 这里先返回模拟数据
    return {
      trade_date: new Date().toISOString().split('T')[0],
      index_change: [1.2, -0.5, 2.1, 0.8],  // [上证, 深证, 创业板, 沪深300]
      market_mood: '震荡',
      north_money: 15.6,
      hot_sectors: ['新能源', '人工智能', '芯片'],
      cold_sectors: ['房地产', '钢铁'],
      up_count: 2150,
      down_count: 1850,
      summary: '今日市场震荡上行，新能源板块表现强势',
    };
  }

  /**
   * 手动触发新闻学习
   */
  async triggerNewsLearning() {
    console.log('[调度器] 手动触发新闻学习');

    try {
      const news = await domesticNewsScraper.getLatestNews();
      const events = await aiLearningService.learnFromNews(news);

      return { news: news.length, events };
    } catch (e) {
      console.error('[调度器] 手动触发失败:', e.message);
      throw e;
    }
  }

  /**
   * 手动触发公告学习
   */
  async triggerBulletinLearning(stockCode = null) {
    console.log('[调度器] 手动触发公告学习', stockCode ? `股票: ${stockCode}` : '');

    try {
      const bulletins = await stockBulletinScraper.getLatestBulletins(stockCode, 100);
      const events = await aiLearningService.learnFromBulletins(bulletins);

      return { bulletins: bulletins.length, events };
    } catch (e) {
      console.error('[调度器] 手动触发失败:', e.message);
      throw e;
    }
  }

  /**
   * 手动触发市场数据记录
   */
  async triggerMarketRecording(marketData) {
    console.log('[调度器] 手动触发市场数据记录');

    try {
      const marketId = await aiLearningService.recordMarketData(marketData);
      return { marketId };
    } catch (e) {
      console.error('[调度器] 手动触发失败:', e.message);
      throw e;
    }
  }

  /**
   * 手动触发关联分析
   */
  async triggerCorrelationAnalysis(date) {
    console.log('[调度器] 手动触发关联分析，日期:', date);

    try {
      const correlations = await aiLearningService.analyzeCorrelation(date);
      return { correlations };
    } catch (e) {
      console.error('[调度器] 手动触发失败:', e.message);
      throw e;
    }
  }

  /**
   * 获取学习统计
   */
  async getStats(days = 30) {
    try {
      const stats = await aiLearningService.getLearningStats(days);
      const todaySummary = await aiLearningService.getTodaySummary();

      return {
        stats,
        today: todaySummary,
      };
    } catch (e) {
      console.error('[调度器] 获取统计失败:', e.message);
      throw e;
    }
  }

  /**
   * 获取调度器状态
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      tasks: Array.from(this.tasks.keys()),
      taskCount: this.tasks.size,
      uptime: this.isRunning ? new Date().toISOString() : null
    };
  }

  /**
   * 停止所有任务
   */
  stop() {
    console.log('[调度器] 停止所有定时任务...');

    this.tasks.forEach((task, name) => {
      task.stop();
      console.log(`[调度器] 停止任务: ${name}`);
    });

    this.tasks.clear();
    this.isRunning = false;

    console.log('[调度器] 所有任务已停止');
  }
}

module.exports = new SchedulerService();
