const https = require('https');
const http = require('http');

/**
 * 增强版新闻抓取器
 * 能够获取完整新闻内容、图片和真实发布时间
 */
class EnhancedNewsScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存
    this.lastFetch = 0;
  }

  async fetchUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const requestOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9',
          ...options.headers
        },
        timeout: 15000,
        ...options
      };

      const req = protocol.get(url, requestOptions, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            return this.fetchUrl(redirectUrl, options).then(resolve).catch(reject);
          }
        }

        let data = [];
        res.on('data', (chunk) => { data.push(chunk); });
        res.on('end', () => {
          resolve(Buffer.concat(data).toString('utf-8'));
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  /**
   * 从HTML中提取发布时间
   */
  extractPublishTime(html, url) {
    // 尝试多种时间格式
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/,
      /(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/,
      /publishedAt["\s:]+["\s]*([^"]+)/,
      /date["\s:]+["\s]*([^"<>]+)/,
      /time["\s:]+["\s]*([^"<>]+)/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          if (match[0].includes('年')) {
            return new Date(match[1], match[2] - 1, match[3], match[4] || 0, match[5] || 0).toISOString();
          }
          const dateStr = match[0].includes('年') ? match[0] : match.slice(1).join('-');
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          continue;
        }
      }
    }

    // 从URL中提取时间
    const urlDateMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
    if (urlDateMatch) {
      return new Date(urlDateMatch[1], urlDateMatch[2] - 1, urlDateMatch[3]).toISOString();
    }

    return new Date().toISOString();
  }

  /**
   * 从HTML中提取图片
   */
  extractImages(html, baseUrl) {
    const images = [];
    const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgPattern.exec(html)) !== null) {
      let imgUrl = match[1];
      if (imgUrl.startsWith('//')) {
        imgUrl = 'http:' + imgUrl;
      } else if (imgUrl.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        imgUrl = urlObj.origin + imgUrl;
      }

      if (imgUrl && !imgUrl.includes('logo') && !imgUrl.includes('icon')) {
        images.push(imgUrl);
      }
    }

    return images.slice(0, 3); // 最多3张图片
  }

  /**
   * 抓取人民网新闻
   */
  async scrapePeopleDaily() {
    try {
      console.log('[人民网] 开始抓取新闻...');
      const html = await this.fetchUrl('http://politics.people.com.cn/GB/1024/index.html');

      const news = [];
      // 简化的匹配模式，更灵活
      const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match;
      let count = 0;

      // 只取前10条新闻（不做详情抓取，加快速度）
      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2].trim();

        if (!url || url === '#' || title.length < 5) continue;

        const fullUrl = url.startsWith('http') ? url : `http://politics.people.com.cn${url}`;

        // 提取时间
        const dateMatch = fullUrl.match(/(\d{4})\/(\d{2})\/(\d{2})/);
        let publishedAt = new Date().toISOString();
        if (dateMatch) {
          publishedAt = new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]).toISOString();
        }

        news.push({
          id: 'people_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: '点击查看详细内容',
          content: `【人民网】${title}\n\n请点击链接查看完整报道。`,
          urlToImage: null,
          images: [],
          publishedAt: publishedAt,
          sourceName: '人民网',
          category: '时政',
          categorySlug: 'politics',
          importanceScore: 0.8
        });
        count++;
      }

      console.log(`[人民网] 成功抓取 ${news.length} 条新闻`);
      return news;
    } catch (error) {
      console.error('[人民网] 抓取失败:', error.message);
      return [];
    }
  }

  /**
   * 抓取新华社新闻
   */
  async scrapeXinhua() {
    try {
      console.log('[新华社] 开始抓取新闻...');
      const html = await this.fetchUrl('http://www.xinhuanet.com/politics/news_politics.htm');

      const news = [];
      const linkPattern = /<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>/g;
      let match;
      let count = 0;

      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2];

        if (!url || url === '#' || !title || title.length < 5) continue;

        const fullUrl = url.startsWith('http') ? url : `http://www.xinhuanet.com${url}`;

        news.push({
          id: 'xinhua_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: '点击查看详细内容',
          content: `【新华网】${title}\n\n请点击链接查看完整报道。`,
          urlToImage: null,
          images: [],
          publishedAt: new Date().toISOString(),
          sourceName: '新华网',
          category: '时政',
          categorySlug: 'politics',
          importanceScore: 0.9
        });
        count++;
      }

      console.log(`[新华社] 成功抓取 ${news.length} 条新闻`);
      return news;
    } catch (error) {
      console.error('[新华社] 抓取失败:', error.message);
      return [];
    }
  }

  /**
   * 抓取央视新闻
   */
  async scrapeCCTV() {
    try {
      console.log('[央视] 开始抓取新闻...');
      const html = await this.fetchUrl('https://news.cctv.com/latest/news');

      const news = [];
      const titlePattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match;
      let count = 0;

      while ((match = titlePattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2];

        if (!url || !title || title.length < 5) continue;

        news.push({
          id: 'cctv_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: url,
          description: '点击查看详情',
          content: `【央视新闻】${title}\n\n请点击链接查看完整报道。`,
          publishedAt: new Date().toISOString(),
          sourceName: '央视新闻',
          category: '时政',
          categorySlug: 'politics',
          importanceScore: 0.85
        });
        count++;
      }

      console.log(`[央视] 成功抓取 ${news.length} 条新闻`);
      return news;
    } catch (error) {
      console.error('[央视] 抓取失败:', error.message);
      return [];
    }
  }

  /**
   * 获取所有最新新闻（带完整内容）
   */
  async getLatestNews() {
    const now = Date.now();

    if (now - this.lastFetch < this.cacheTimeout && this.cache.has('news')) {
      console.log('[增强抓取器] 使用缓存');
      return this.cache.get('news');
    }

    console.log('[增强抓取器] 开始抓取完整新闻...');
    const allNews = [];

    try {
      const peopleNews = await this.scrapePeopleDaily();
      allNews.push(...peopleNews);
    } catch (e) {
      console.error('[增强抓取器] 人民网失败:', e.message);
    }

    try {
      const xinhuaNews = await this.scrapeXinhua();
      allNews.push(...xinhuaNews);
    } catch (e) {
      console.error('[增强抓取器] 新华网失败:', e.message);
    }

    try {
      const cctvNews = await this.scrapeCCTV();
      allNews.push(...cctvNews);
    } catch (e) {
      console.error('[增强抓取器] 央视失败:', e.message);
    }

    this.cache.set('news', allNews);
    this.lastFetch = now;

    console.log(`[增强抓取器] 总共获取 ${allNews.length} 条新闻`);
    return allNews;
  }
}

module.exports = new EnhancedNewsScraper();
