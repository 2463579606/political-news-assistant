const https = require('https');
const http = require('http');
const TurndownService = require('turndown');

// 创建 HTML 到 Markdown 转换器
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
});

/**
 * 真实新闻抓取器 - 抓取并转换为 Markdown
 */
class MarkdownNewsScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60 * 60 * 1000; // 1小时缓存
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
        timeout: 20000,
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
   * 清理 HTML，移除不需要的元素
   */
  cleanHtml(html) {
    // 移除 script, style, nav, footer 等标签
    let cleaned = html.replace(/<(script|style|nav|footer|header|aside|iframe)[^>]*>[\s\S]*?<\/\1>/gi, '');

    // 移除注释
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

    return cleaned;
  }

  /**
   * 从 HTML 中提取主要内容
   */
  extractMainContent(html) {
    // 尝试多种常见的内容容器
    const contentPatterns = [
      /<article[^>]*>([\s\S]*?)<\/article>/,
      /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
      /<div[^>]*id="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/
    ];

    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1].length > 200) {
        return match[1];
      }
    }

    // 如果都失败了，返回 body 内容
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
    return bodyMatch ? bodyMatch[1] : html;
  }

  /**
   * 从页面提取发布时间
   */
  extractPublishTime(html, url) {
    const patterns = [
      /(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/,
      /(\d{4})年(\d{1,2})月(\d{1,2})日\s*(\d{1,2}):(\d{2})/,
      /(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/,
      /time["\s:]+["\s]*([^"<>]+)/,
      /date["\s:]+["\s]*([^"<>]+)/
    ];

    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match) {
        try {
          if (match[0].includes('年')) {
            return new Date(match[1], match[2] - 1, match[3], match[4] || 0, match[5] || 0).toISOString();
          }
          const date = new Date(match[0].includes('年') ? match[0].replace(/年|月/g, '-').replace(/日/, '') : match[0]);
          if (!isNaN(date.getTime())) {
            return date.toISOString();
          }
        } catch (e) {
          continue;
        }
      }
    }

    // 从 URL 提取时间
    const urlDateMatch = url.match(/(\d{4})\/(\d{2})\/(\d{2})/);
    if (urlDateMatch) {
      return new Date(urlDateMatch[1], urlDateMatch[2] - 1, urlDateMatch[3]).toISOString();
    }

    return new Date().toISOString();
  }

  /**
   * 从页面提取图片
   */
  extractImages(html, baseUrl) {
    const images = [];
    const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgPattern.exec(html)) !== null) {
      let imgUrl = match[1];
      if (imgUrl.startsWith('//')) {
        imgUrl = 'https:' + imgUrl;
      } else if (imgUrl.startsWith('/')) {
        try {
          const urlObj = new URL(baseUrl);
          imgUrl = urlObj.origin + imgUrl;
        } catch (e) {
          continue;
        }
      }

      // 过滤掉小图标和装饰性图片
      if (!imgUrl.includes('logo') && !imgUrl.includes('icon') &&
          !imgUrl.includes('banner') && imgUrl.length > 20) {
        images.push(imgUrl);
      }
    }

    return images.slice(0, 5);
  }

  /**
   * 抓取单条新闻详情并转换为 Markdown
   */
  async scrapeNewsDetail(newsUrl, sourceName, title) {
    try {
      console.log(`[${sourceName}] 抓取新闻详情: ${title.substring(0, 30)}...`);

      const html = await this.fetchUrl(newsUrl);
      const cleanedHtml = this.cleanHtml(html);

      // 提取主要内容
      const mainContent = this.extractMainContent(cleanedHtml);

      // 转换为 Markdown
      const markdown = turndownService.turndown(mainContent);

      // 提取发布时间
      const publishedAt = this.extractPublishTime(html, newsUrl);

      // 提取图片
      const images = this.extractImages(html, newsUrl);

      return {
        markdown,
        publishedAt,
        images,
        url: newsUrl
      };
    } catch (error) {
      console.error(`[${sourceName}] 抓取详情失败:`, error.message);
      return null;
    }
  }

  /**
   * 抓取新闻列表并获取完整内容
   */
  async scrapeWithFullContent(sourceUrl, sourceConfig) {
    try {
      console.log(`[${sourceConfig.name}] 开始抓取新闻列表...`);

      const html = await this.fetchUrl(sourceUrl);

      const news = [];
      const linkPattern = sourceConfig.linkPattern;
      let match;
      let count = 0;

      // 提取新闻列表
      while ((match = linkPattern.exec(html)) !== null && count < sourceConfig.maxNews) {
        const url = match[sourceConfig.urlGroup || 1];
        const title = (match[sourceConfig.titleGroup || 2] || '').trim();

        // 过滤无效链接
        if (!url || url === '#' || title.length < 10 ||
            title.includes('更多') || title.includes('首页')) {
          continue;
        }

        const fullUrl = url.startsWith('http') ? url : new URL(url, sourceUrl).href;

        news.push({
          id: `${sourceConfig.id}_${Date.now()}_${count}`,
          title: title.substring(0, 100),
          url: fullUrl,
          sourceName: sourceConfig.name,
          category: sourceConfig.category,
          categorySlug: sourceConfig.categorySlug,
          importanceScore: sourceConfig.importanceScore || 0.8,
          _needDetail: true // 标记需要抓取详情
        });
        count++;
      }

      console.log(`[${sourceConfig.name}] 获取到 ${news.length} 条新闻`);

      // 抓取前 N 条的完整内容（避免太慢）
      const detailCount = Math.min(news.length, 5);
      console.log(`[${sourceConfig.name}] 开始抓取前 ${detailCount} 条详情...`);

      for (let i = 0; i < detailCount; i++) {
        const detail = await this.scrapeNewsDetail(news[i].url, sourceConfig.name, news[i].title);
        if (detail) {
          news[i].content = detail.markdown;
          news[i].description = detail.markdown.substring(0, 150) + '...';
          news[i].publishedAt = detail.publishedAt;
          news[i].images = detail.images;
          news[i].urlToImage = detail.images[0] || null;
        } else {
          // 如果抓取失败，使用默认内容
          news[i].content = `【${sourceConfig.name}】${news[i].title}\n\n请点击链接查看完整报道。`;
          news[i].description = '点击查看详细内容';
          news[i].publishedAt = new Date().toISOString();
        }
      }

      // 剩余新闻使用简化内容
      for (let i = detailCount; i < news.length; i++) {
        news[i].content = `【${sourceConfig.name}】${news[i].title}\n\n请点击链接查看完整报道。`;
        news[i].description = '点击查看详细内容';
        news[i].publishedAt = new Date().toISOString();
      }

      return news;
    } catch (error) {
      console.error(`[${sourceConfig.name}] 抓取失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有最新新闻
   */
  async getLatestNews() {
    const cacheKey = 'news';
    const now = Date.now();

    if (now - this.lastFetch < this.cacheTimeout && this.cache.has(cacheKey)) {
      console.log('[Markdown抓取器] 使用缓存');
      return this.cache.get(cacheKey);
    }

    console.log('[Markdown抓取器] 开始抓取真实新闻（Markdown格式）...');
    const allNews = [];

    // 定义新闻源配置
    const sources = [
      {
        name: '人民网',
        id: 'people',
        url: 'http://politics.people.com.cn/GB/1024/index.html',
        linkPattern: /<li><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/li>/g,
        category: '时政',
        categorySlug: 'politics',
        importanceScore: 0.85,
        maxNews: 6
      },
      {
        name: '新华网',
        id: 'xinhua',
        url: 'http://www.xinhuanet.com/politics/news_politics.htm',
        linkPattern: /<a[^>]*href="([^"]+)"[^>]*title="([^"]+)"[^>]*>/g,
        category: '时政',
        categorySlug: 'politics',
        importanceScore: 0.9,
        maxNews: 6
      },
      {
        name: '央视网',
        id: 'cctv',
        url: 'https://news.cctv.com/latest/news',
        linkPattern: /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g,
        category: '时政',
        categorySlug: 'politics',
        importanceScore: 0.85,
        maxNews: 5
      }
    ];

    // 并发抓取所有新闻源
    const scrapePromises = sources.map(source =>
      this.scrapeWithFullContent(source.url, source).catch(err => {
        console.error(`抓取 ${source.name} 失败:`, err.message);
        return [];
      })
    );

    const results = await Promise.all(scrapePromises);
    results.forEach(news => allNews.push(...news));

    // 按发布时间和重要性排序
    allNews.sort((a, b) => {
      const importanceDiff = (b.importanceScore || 0) - (a.importanceScore || 0);
      if (Math.abs(importanceDiff) > 0.1) {
        return importanceDiff;
      }
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    this.cache.set(cacheKey, allNews);
    this.lastFetch = now;

    console.log(`[Markdown抓取器] 总共获取 ${allNews.length} 条新闻（${allNews.filter(n => n.content && n.content.length > 100).length} 条有完整内容）`);
    return allNews;
  }
}

module.exports = new MarkdownNewsScraper();
