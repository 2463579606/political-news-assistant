const Parser = require('rss-parser');
const TurndownService = require('turndown');
const https = require('https');
const http = require('http');

// 创建 RSS 解析器
const parser = new Parser({
  timeout: 20000,
  customFields: {
    item: [['media:content', 'media:content', 'enclosure']]
  }
});

// 创建 HTML 到 Markdown 转换器
const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});

/**
 * RSS 新闻抓取服务
 * 从新闻网站的 RSS 订阅源获取真实新闻并转换为 Markdown
 */
class RSSNewsScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30分钟缓存
    this.lastFetch = 0;
  }

  /**
   * HTTP 请求方法
   */
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
   * 清理 HTML 标签
   */
  cleanHtml(html) {
    if (!html) return '';
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[^>]*>[\s\S]*?<\/iframe>/gi, '')
      .trim();
  }

  /**
   * 转换为 Markdown
   */
  convertToMarkdown(html) {
    if (!html) return '';
    const cleaned = this.cleanHtml(html);
    return turndownService.turndown(cleaned);
  }

  /**
   * 提取图片 URL
   */
  extractImage(item) {
    // 尝试多种方式提取图片
    if (item['media:content'] && item['media:content'].$) {
      return item['media:content'].$;
    }
    if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
      return item.enclosure.url;
    }
    if (item['media:thumbnail']) {
      return item['media:thumbnail'];
    }
    // 从内容中提取第一张图片
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/);
      if (imgMatch) {
        return imgMatch[1];
      }
    }
    return null;
  }

  /**
   * 检查新闻是否足够新
   */
  isRecentNews(pubDate, title = '') {
    // 基于内容的过滤：排除明显过时的新闻（2022年疫情相关）
    const outdatedKeywords = [
      'BQ.1',
      '奥密克戎',
      '动态清零',
      '方舱',
      '健康码',
      '疫情防控措施优化',
      '复商复市',
      '加强免疫接种',
      '无症状感染者',
      '心血管病患者一旦感染新冠病毒',
      '老年人现在打疫苗晚不晚'
    ];

    if (outdatedKeywords.some(keyword => title.includes(keyword))) {
      return false;
    }

    if (!pubDate) return true; // 如果没有日期，默认接受
    const newsDate = new Date(pubDate);
    const now = new Date();
    const daysDiff = (now - newsDate) / (1000 * 60 * 60 * 24);
    // 接受365天内的新闻（因为RSS源更新不频繁）
    return daysDiff < 365;
  }

  /**
   * 从单个 RSS 源抓取新闻
   */
  async scrapeRSSFeed(rssUrl, sourceConfig) {
    try {
      console.log(`[${sourceConfig.name}] 开始抓取 RSS: ${rssUrl}`);

      const feed = await parser.parseURL(rssUrl);

      if (!feed.items || feed.items.length === 0) {
        console.log(`[${sourceConfig.name}] RSS 源没有数据`);
        return [];
      }

      const news = [];

      // 限制抓取数量
      const maxItems = Math.min(feed.items.length, sourceConfig.maxItems || 8);

      for (let i = 0; i < maxItems; i++) {
        const item = feed.items[i];

        // 提取标题
        const title = item.title || '无标题';
        if (title.length < 5) continue;

        // 提取链接
        const url = item.link || item.guid;
        if (!url) continue;

        // 提取发布时间
        let publishedAt = new Date().toISOString();
        if (item.pubDate) {
          try {
            publishedAt = new Date(item.pubDate).toISOString();
            // 检查新闻是否足够新（传入标题进行内容过滤）
            if (!this.isRecentNews(item.pubDate, title)) {
              console.log(`[${sourceConfig.name}] 跳过过期新闻: ${title.substring(0, 30)} (${item.pubDate})`);
              continue;
            }
          } catch (e) {
            console.warn(`[${sourceConfig.name}] 解析发布时间失败:`, item.pubDate);
          }
        } else {
          // 如果没有日期，也进行内容过滤
          if (!this.isRecentNews(null, title)) {
            console.log(`[${sourceConfig.name}] 跳过过时内容: ${title.substring(0, 30)}...`);
            continue;
          }
        }

        // 提取描述
        const description = (item.contentSnippet || item.snippet || '')
          .replace(/<[^>]+>/g, '')
          .substring(0, 150) + '...';

        // 提取图片
        const urlToImage = this.extractImage(item);

        // 初始化新闻对象
        const newsItem = {
          id: `${sourceConfig.id}_${Date.now()}_${i}`,
          title: title,
          url: url,
          description: description,
          urlToImage: urlToImage,
          images: urlToImage ? [urlToImage] : [],
          publishedAt: publishedAt,
          sourceName: sourceConfig.name,
          category: sourceConfig.category,
          categorySlug: sourceConfig.categorySlug,
          importanceScore: sourceConfig.importanceScore || 0.8,
          content: '',
          _needDetail: true // 标记需要抓取详情
        };

        // 尝试抓取详情页面的完整内容
        try {
          console.log(`[${sourceConfig.name}] 抓取详情: ${title.substring(0, 30)}...`);
          const detailContent = await this.fetchNewsDetail(url);
          if (detailContent && detailContent.content && detailContent.content.length > 200) {
            newsItem.content = detailContent.content;
            newsItem.description = detailContent.content.substring(0, 150) + '...';
            if (detailContent.images && detailContent.images.length > 0) {
              newsItem.images = detailContent.images;
              newsItem.urlToImage = detailContent.images[0];
            }
            console.log(`[${sourceConfig.name}] 详情抓取成功 (${detailContent.content.length} 字符)`);
          } else {
            // 如果详情抓取失败，使用 RSS 内容
            const contentHtml = item.content || item['content:encoded'] || item.contentSnippet || '';
            newsItem.content = contentHtml.length > 50
              ? this.convertToMarkdown(contentHtml)
              : `${sourceConfig.name}新闻报道：${title}\n\n${contentHtml}`;
          }
        } catch (e) {
          console.error(`[${sourceConfig.name}] 详情抓取失败:`, e.message);
          // 使用 RSS 内容
          const contentHtml = item.content || item['content:encoded'] || item.contentSnippet || '';
          newsItem.content = contentHtml.length > 50
            ? this.convertToMarkdown(contentHtml)
            : `${sourceConfig.name}新闻报道：${title}\n\n${contentHtml}`;
        }

        news.push(newsItem);
      }

      console.log(`[${sourceConfig.name}] 成功抓取 ${news.length} 条新闻`);
      return news;
    } catch (error) {
      console.error(`[${sourceConfig.name}] RSS 抓取失败:`, error.message);
      return [];
    }
  }

  /**
   * 抓取新闻详情页面
   */
  async fetchNewsDetail(url) {
    try {
      const html = await this.fetchUrl(url);
      const cleaned = this.cleanHtml(html);

      // 提取主要内容区域
      const contentPatterns = [
        /<article[^>]*>([\s\S]*?)<\/article>/,
        /<div[^>]*class="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/,
        /<div[^>]*id="[^"]*article[^"]*"[^>]*>([\s\S]*?)<\/div>/
      ];

      let mainContent = '';
      for (const pattern of contentPatterns) {
        const match = cleaned.match(pattern);
        if (match && match[1].length > 300) {
          mainContent = match[1];
          break;
        }
      }

      if (!mainContent || mainContent.length < 100) {
        return null;
      }

      // 转换为 Markdown
      const markdown = this.convertToMarkdown(mainContent);

      // 提取图片
      const images = this.extractImagesFromHtml(mainContent, url);

      return {
        content: markdown,
        images: images
      };
    } catch (error) {
      console.error('[详情抓取] 失败:', error.message);
      return null;
    }
  }

  /**
   * 从 HTML 中提取图片
   */
  extractImagesFromHtml(html, baseUrl) {
    const images = [];
    const imgPattern = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;

    while ((match = imgPattern.exec(html)) !== null && images.length < 5) {
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

      if (!imgUrl.includes('logo') && !imgUrl.includes('icon') &&
          imgUrl.length > 20) {
        images.push(imgUrl);
      }
    }

    return images;
  }

  /**
   * 直接抓取新闻网站首页
   */
  async scrapeNewsSite(siteConfig) {
    try {
      console.log(`[${siteConfig.name}] 直接抓取网站首页: ${siteConfig.homeUrl}`);

      // 使用更完整的请求头
      const html = await this.fetchUrl(siteConfig.homeUrl, {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!html || html.includes('403 Forbidden') || html.includes('301 Moved')) {
        console.error(`[${siteConfig.name}] 无法访问网站 (403/301)`);
        return [];
      }

      const cleaned = this.cleanHtml(html);

      // 提取新闻链接和标题
      const newsLinks = [];

      // 使用更宽松的链接提取规则
      const linkPattern = /<a\s+[^>]*?href=["']([^"']+)["'][^>]*?>([^<]+)<\/a>/gi;
      let match;
      const seenUrls = new Set();

      while ((match = linkPattern.exec(cleaned)) !== null) {
        let url = match[1];
        const title = match[2].replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

        // 过滤无效链接
        if (url.startsWith('javascript:') || url.startsWith('#') || url.startsWith('mailto:')) {
          continue;
        }

        // 根据不同网站使用不同的过滤规则
        let isValid = false;

        if (siteConfig.id === 'people') {
          // 人民网：匹配 /n1/ 链接
          isValid = url.includes('/n1/') || url.includes('/GB/');
        } else if (siteConfig.id === 'xinhua') {
          // 新华网：匹配 politics 下的新闻链接
          isValid = url.includes('/politics/') && url.match(/\d{4}-\d{2}/);
        }

        // 标题长度过滤
        if (!isValid || title.length < 8 || title.length > 80) {
          continue;
        }

        // 转换为完整URL
        if (!url.startsWith('http')) {
          if (url.startsWith('/')) {
            url = siteConfig.homeUrl + url;
          } else {
            continue;
          }
        }

        if (!seenUrls.has(url)) {
          newsLinks.push({ url, title });
          seenUrls.add(url);

          if (newsLinks.length >= siteConfig.maxItems) break;
        }
      }

      console.log(`[${siteConfig.name}] 提取到 ${newsLinks.length} 个新闻链接`);

      // 抓取每篇新闻的详情
      const news = [];
      for (let i = 0; i < newsLinks.length; i++) {
        try {
          console.log(`[${siteConfig.name}] 抓取详情 (${i+1}/${newsLinks.length}): ${newsLinks[i].title.substring(0, 25)}...`);

          const detailContent = await this.fetchNewsDetail(newsLinks[i].url);

          if (detailContent && detailContent.content && detailContent.content.length > 150) {
            news.push({
              id: `${siteConfig.id}_${Date.now()}_${i}`,
              title: newsLinks[i].title,
              url: newsLinks[i].url,
              description: detailContent.content.substring(0, 150) + '...',
              urlToImage: detailContent.images?.[0] || null,
              images: detailContent.images || [],
              publishedAt: new Date().toISOString(),
              sourceName: siteConfig.name,
              category: siteConfig.category,
              categorySlug: siteConfig.categorySlug,
              importanceScore: siteConfig.importanceScore || 0.8,
              content: detailContent.content
            });
            console.log(`[${siteConfig.name}] 详情抓取成功 (${detailContent.content.length} 字符)`);
          }
        } catch (e) {
          console.error(`[${siteConfig.name}] 详情抓取失败:`, e.message);
        }
      }

      console.log(`[${siteConfig.name}] 成功抓取 ${news.length} 条新闻`);
      return news;
    } catch (error) {
      console.error(`[${siteConfig.name}] 网站抓取失败:`, error.message);
      return [];
    }
  }

  /**
   * 获取所有最新新闻（使用RSS源）
   */
  async getLatestNews() {
    const cacheKey = 'rss_news';
    const now = Date.now();

    if (now - this.lastFetch < this.cacheTimeout && this.cache.has(cacheKey)) {
      console.log('[RSS抓取器] 使用缓存');
      return this.cache.get(cacheKey);
    }

    console.log('[RSS抓取器] 开始抓取 RSS 新闻源...');

    const allNews = [];

    // 定义 RSS 源配置
    const rssSources = [
      {
        name: '人民网',
        id: 'people',
        url: 'http://www.people.com.cn/rss/politics.xml',
        category: '时政',
        categorySlug: 'politics',
        importanceScore: 0.85,
        maxItems: 10
      },
      {
        name: '新华网',
        id: 'xinhua',
        url: 'http://www.xinhuanet.com/politics/news_politics.xml',
        category: '时政',
        categorySlug: 'politics',
        importanceScore: 0.9,
        maxItems: 10
      }
    ];

    // 并发抓取所有 RSS 源
    const scrapePromises = rssSources.map(source =>
      this.scrapeRSSFeed(source.url, source)
    );

    const results = await Promise.all(scrapePromises);
    results.forEach(news => allNews.push(...news));

    // 如果 RSS 没有足够数据，使用备用方案
    if (allNews.length === 0) {
      console.log('[RSS抓取器] RSS 源无数据，使用备用方案...');
      // 返回空数组，让其他抓取器补充
      return [];
    }

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

    console.log(`[RSS抓取器] 总共获取 ${allNews.length} 条真实新闻（来自 RSS 源）`);
    return allNews;
  }
}

module.exports = new RSSNewsScraper();
