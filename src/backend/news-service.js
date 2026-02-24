/**
 * 实时新闻抓取服务 V9
 * 优先使用 RSS 抓取器获取真实新闻源并转换为 Markdown
 */

const rssNewsScraper = require('./rss-news-scraper');
const markdownNewsScraper = require('./markdown-news-scraper');
const realNewsScraper = require('./real-news-scraper');
const enhancedNewsScraper = require('./enhanced-news-scraper');
const domesticNewsScraper = require('./domestic-news-scraper');

class RealTimeNewsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1小时缓存（避免ID频繁变化）
    this.lastFetch = 0;
  }

  /**
   * 获取所有最新新闻（优先国内新闻源）
   */
  async getLatestNews() {
    const now = Date.now();

    // 检查缓存
    if (now - this.lastFetch < this.cacheTimeout && this.cache.has('news')) {
      console.log('[新闻服务] 使用缓存的新闻数据');
      return this.cache.get('news');
    }

    console.log('[新闻服务] 🔄 抓取最新实时新闻（优先使用 RSS 源）...');

    try {
      const allNews = [];

      // 1. 优先使用 RSS 抓取器（真实新闻源，包含完整内容）
      console.log('[新闻服务] 使用 RSS 抓取器获取真实新闻...');
      try {
        const rssNews = await rssNewsScraper.getLatestNews();
        allNews.push(...rssNews);
        console.log(`[新闻服务] RSS 抓取器: 获取到 ${rssNews.length} 条真实新闻`);
      } catch (e) {
        console.error('[新闻服务] RSS 抓取器失败，使用备用方案:', e.message);
      }

      // 2. 如果新闻太少，使用 Markdown 抓取器补充
      if (allNews.length < 10) {
        console.log('[新闻服务] 新闻数量不足，使用 Markdown 抓取器补充...');
        try {
          const markdownNews = await markdownNewsScraper.getLatestNews();
          allNews.push(...markdownNews);
          console.log(`[新闻服务] Markdown 抓取器: 获取到 ${markdownNews.length} 条`);
        } catch (e) {
          console.error('[新闻服务] Markdown 抓取器失败:', e.message);
        }
      }

      // 3. 如果仍然不够，使用真实新闻抓取器补充
      if (allNews.length < 5) {
        console.log('[新闻服务] 仍然不足，使用真实新闻抓取器补充...');
        try {
          const realNews = await realNewsScraper.getLatestNews();
          allNews.push(...realNews);
          console.log(`[新闻服务] 真实新闻: 获取到 ${realNews.length} 条`);
        } catch (e) {
          console.error('[新闻服务] 真实新闻抓取失败:', e.message);
        }
      }

      // 4. 如果新闻太少，添加说明
      if (allNews.length === 0) {
        allNews.push({
          id: `system_${Date.now()}`,
          title: `数据更新提示 - ${new Date().toLocaleString('zh-CN')}：新闻服务正在优化中`,
          url: '#',
          description: '系统正在添加更多实时新闻源，敬请期待',
          content: '我们正在努力为您提供更多实时新闻来源。',
          publishedAt: new Date().toISOString(),
          sourceName: '系统消息',
          category: '系统',
          categorySlug: 'system',
          importanceScore: 0.9,
          keywords: ['系统', '更新']
        });
      }

      // 按重要性和时间排序
      allNews.sort((a, b) => {
        // 首先按重要性降序
        const importanceDiff = (b.importanceScore || 0) - (a.importanceScore || 0);
        if (Math.abs(importanceDiff) > 0.1) {
          return importanceDiff;
        }
        // 重要性相同时按时间降序
        return new Date(b.publishedAt) - new Date(a.publishedAt);
      });

      // 限制数量
      const limitedNews = allNews.slice(0, 50);

      // 更新缓存
      this.cache.set('news', limitedNews);
      this.lastFetch = now;

      console.log(`[新闻服务] ✅ 成功抓取 ${limitedNews.length} 条实时新闻`);
      console.log(`[新闻服务]    最新新闻时间: ${limitedNews[0]?.publishedAt || 'N/A'}`);
      console.log(`[新闻服务]    来源分布: ${this.getSourceDistribution(limitedNews)}`);

      return limitedNews;

    } catch (error) {
      console.error('[新闻服务] ❌ 新闻抓取失败:', error.message);

      // 如果失败且有缓存，返回缓存
      if (this.cache.has('news')) {
        console.log('[新闻服务] 使用缓存的新闻数据');
        return this.cache.get('news');
      }

      return [];
    }
  }

  /**
   * 获取来源分布统计
   */
  getSourceDistribution(news) {
    const distribution = {};
    news.forEach(item => {
      const source = item.sourceName || '未知';
      distribution[source] = (distribution[source] || 0) + 1;
    });
    return Object.entries(distribution)
      .map(([source, count]) => `${source}(${count})`)
      .join(', ');
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    const cachedNews = this.cache.get('news') || [];
    return {
      lastFetch: new Date(this.lastFetch).toISOString(),
      cacheSize: cachedNews.length,
      cacheAge: Date.now() - this.lastFetch,
      sourceDistribution: this.getSourceDistribution(cachedNews)
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
    console.log('[新闻服务] 新闻缓存已清除');
  }
}

module.exports = new RealTimeNewsService();
