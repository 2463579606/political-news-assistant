/**
 * 无需API Key的新闻服务
 * 使用公开可用的新闻聚合服务
 */

const https = require('https');
const http = require('http');

class NoApiKeyNewsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5分钟
    this.lastFetch = 0;
  }

  /**
   * 从SpaceFlight News API抓取（示例：公开API）
   */
  async fetchFromPublicAPI() {
    return new Promise((resolve) => {
      // 使用一个公开的示例API
      https.get('https://api.spaceflightnewsapi.net/v4/articles/?limit=10', {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            const items = result.map((item, index) => ({
              id: `space_${index}_${Date.now()}`,
              title: item.title || '航天新闻',
              url: item.url || '#',
              description: (item.summary || '').substring(0, 200),
              content: item.summary || '',
              publishedAt: item.published_at || new Date().toISOString(),
              sourceName: item.news_site || '航天新闻',
              category: '科技',
              categorySlug: 'technology',
              importanceScore: 0.6
            }));
            console.log(`获取到 ${items.length} 条航天新闻`);
            resolve(items);
          } catch (e) {
            console.error('解析失败:', e.message);
            resolve([]);
          }
        });
      }).on('error', () => resolve([]));
    });
  }

  /**
   * 从JSONPlaceholder Mock API获取（测试用）
   */
  async fetchMockData() {
    try {
      const response = await fetch('https://jsonplaceholder.typicode.com/posts');
      const posts = await response.json();

      return posts.slice(0, 10).map((post, index) => ({
        id: `mock_${post.id}_${Date.now()}`,
        title: `[示例] ${post.title}`,
        url: `https://jsonplaceholder.typicode.com/posts/${post.id}`,
        description: post.body.substring(0, 100),
        content: post.body,
        publishedAt: new Date().toISOString(),
        sourceName: '示例数据源',
        category: '时政',
        categorySlug: 'politics',
        importanceScore: 0.5
      }));
    } catch (e) {
      console.error('获取mock数据失败:', e.message);
      return [];
    }
  }

  /**
   * 生成系统新闻提示
   */
  generateSystemNews() {
    const now = new Date();
    const beijingTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);

    return {
      id: `system_${Date.now()}`,
      title: `【系统消息】${beijingTime.toLocaleString('zh-CN')} - 新闻服务配置说明`,
      url: '#',
      description: '请查看以下配置说明',
      content: `
新闻服务配置说明：

当前状态：系统正在运行，但需要配置新闻API Key才能获取实时新闻。

免费方案：
1. GNews API（推荐）
   - 免费额度：100次/天
   - 注册地址：https://gnews.io
   - 步骤：
     a. 访问 gnews.io 并注册账户
     b. 登录后获取 API Key
     c. 在服务器 .env 文件添加：GNEWS_API_KEY=你的密钥
     d. 重启：pm2 restart political-backend

2. NewsAPI.org
   - 免费额度：有限但足够
   - 注册地址：https://newsapi.org/register
   - 配置方法同上

付费方案（如果需要更大量数据）：
- Newsdata.io
- Currents API
- Bing News Search

配置后系统将自动获取实时时政新闻。
      `,
      publishedAt: now.toISOString(),
      sourceName: '系统消息',
      category: '系统',
      categorySlug: 'system',
      importanceScore: 1.0
    };
  }

  /**
   * 获取所有最新新闻
   */
  async getLatestNews() {
    const now = Date.now();

    // 检查缓存
    if (now - this.lastFetch < this.cacheTimeout && this.cache.has('news')) {
      console.log('使用缓存的新闻数据');
      return this.cache.get('news');
    }

    console.log('🔄 抓取最新新闻...');

    try {
      const allNews = [];

      // 1. 添加系统消息
      allNews.push(this.generateSystemNews());

      // 2. 尝试从公开API获取
      const publicNews = await this.fetchFromPublicAPI();
      allNews.push(...publicNews);

      // 3. 如果新闻太少，添加示例数据
      if (allNews.length < 5) {
        const mockData = await this.fetchMockData();
        allNews.push(...mockData);
      }

      // 按时间排序
      allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      // 限制数量
      const limitedNews = allNews.slice(0, 20);

      // 更新缓存
      this.cache.set('news', limitedNews);
      this.lastFetch = now;

      console.log(`✅ 成功获取 ${limitedNews.length} 条新闻`);
      return limitedNews;

    } catch (error) {
      console.error('❌ 新闻获取失败:', error.message);

      // 返回系统消息
      return [this.generateSystemNews()];
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      lastFetch: new Date(this.lastFetch).toISOString(),
      cacheSize: this.cache.get('news')?.length || 0,
      cacheAge: Date.now() - this.lastFetch
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
    console.log('新闻缓存已清除');
  }
}

module.exports = new NoApiKeyNewsService();
