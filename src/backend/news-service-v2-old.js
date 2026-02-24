/**
 * 真实新闻抓取服务 V2
 * 使用RSS从权威媒体抓取新闻
 */

const https = require('https');
const http = require('http');

class NewsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 15 * 60 * 1000; // 15分钟缓存
    this.lastFetch = 0;

    // 权威新闻RSS源（真实、可验证）
    this.newsSources = [
      {
        name: '央视新闻',
        url: 'http://news.cctv.com/latest/rss/',
        category: '时政',
        categorySlug: 'politics'
      },
      {
        name: '人民网',
        url: 'http://www.people.com.cn/rss/politics.xml',
        category: '时政',
        categorySlug: 'politics'
      },
      {
        name: '新华网',
        url: 'http://www.xinhuanet.com/politics/news_politics.xml',
        category: '时政',
        categorySlug: 'politics'
      },
      {
        name: '新浪财经',
        url: 'http://finance.sina.com.cn/roll/index.d.html',
        category: '财经',
        categorySlug: 'business'
      }
    ];
  }

  /**
   * 解析RSS XML
   */
  parseRSSXML(xmlString, sourceInfo) {
    const items = [];

    // 匹配<item>标签
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const itemMatches = xmlString.match(itemRegex) || [];

    itemMatches.forEach((item, index) => {
      try {
        // 提取标题（处理CDATA）
        let title = '';
        const titleMatchCDATA = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/i);
        const titleMatch = item.match(/<title>(.*?)<\/title>/i);

        if (titleMatchCDATA) {
          title = titleMatchCDATA[1].trim();
        } else if (titleMatch) {
          title = titleMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim();
        }

        // 提取链接
        const linkMatch = item.match(/<link>(.*?)<\/link>/i);
        const link = linkMatch ? linkMatch[1].trim() : '';

        // 提取描述
        let description = '';
        const descMatchCDATA = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/i);
        const descMatch = item.match(/<description>(.*?)<\/description>/i);

        if (descMatchCDATA) {
          description = descMatchCDATA[1].replace(/<[^>]*>/g, '').trim();
        } else if (descMatch) {
          description = descMatch[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]*>/g, '').trim();
        }

        // 提取发布时间
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/i);
        const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date();

        // 验证必需字段
        if (title && title.length > 5) {
          items.push({
            id: `${sourceInfo.categorySlug}_${sourceInfo.name}_${index}_${Date.now()}`,
            title: title,
            url: link,
            description: description.substring(0, 200),
            content: description,
            publishedAt: publishedAt.toISOString(),
            sourceName: sourceInfo.name,
            category: sourceInfo.category,
            categorySlug: sourceInfo.categorySlug,
            importanceScore: 0.6,
            keywords: []
          });
        }
      } catch (error) {
        // 跳过解析失败的条目
        console.warn('RSS item parse error:', error.message);
      }
    });

    return items;
  }

  /**
   * 获取RSS内容
   */
  async fetchRSS(url) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const options = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        timeout: 10000
      };

      const req = protocol.get(url, options, (res) => {
        // 处理重定向
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return this.fetchRSS(res.headers.location).then(resolve).catch(reject);
        }

        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      });

      req.on('error', (err) => {
        console.error(`RSS fetch error for ${url}:`, err.message);
        resolve(null); // 返回null而不是拒绝，允许继续处理其他源
      });

      req.on('timeout', () => {
        req.destroy();
        console.error(`RSS fetch timeout for ${url}`);
        resolve(null);
      });

      req.setTimeout(10000);
    });
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

    console.log('从RSS源抓取最新新闻...');

    try {
      const allNews = [];
      const sourceResults = await Promise.allSettled(
        this.newsSources.map(source =>
          this.fetchRSS(source.url)
            .then(xml => {
              if (xml) {
                const items = this.parseRSSXML(xml, source);
                console.log(`${source.name}: 获取到 ${items.length} 条新闻`);
                return items;
              }
              return [];
            })
        )
      );

      // 收集所有成功的新闻
      sourceResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allNews.push(...result.value);
        }
      });

      // 按时间排序
      allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      // 过滤掉7天前的新闻
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentNews = allNews.filter(n => new Date(n.publishedAt) > sevenDaysAgo);

      // 限制数量
      const limitedNews = recentNews.slice(0, 100);

      // 更新缓存
      this.cache.set('news', limitedNews);
      this.lastFetch = now;

      console.log(`✅ 成功抓取 ${limitedNews.length} 条最新新闻`);
      return limitedNews;

    } catch (error) {
      console.error('❌ 新闻抓取失败:', error.message);

      // 如果失败且有缓存，返回缓存
      if (this.cache.has('news')) {
        console.log('使用缓存的新闻数据');
        return this.cache.get('news');
      }

      // 返回空数组而不是null
      return [];
    }
  }

  /**
   * 获取缓存状态
   */
  getCacheStatus() {
    return {
      lastFetch: new Date(this.lastFetch).toISOString(),
      cacheSize: this.cache.get('news')?.length || 0,
      cacheAge: Date.now() - this.lastFetch,
      sourcesCount: this.newsSources.length
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

module.exports = new NewsService();
