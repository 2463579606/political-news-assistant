const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * 国内新闻抓取器
 * 从主要国内媒体抓取时政和财经新闻
 */
class DomesticNewsScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 600000; // 10分钟缓存
    this.lastFetch = 0;
  }

  /**
   * 通用HTTP请求方法
   */
  async fetchUrl(url, options = {}) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const requestOptions = {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          ...options.headers
        },
        timeout: 10000,
        ...options
      };

      const req = protocol.get(url, requestOptions, (res) => {
        // 处理重定向
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            console.log(`[HTTP] 重定向: ${url} -> ${redirectUrl}`);
            return this.fetchUrl(redirectUrl, options).then(resolve).catch(reject);
          }
        }

        let data = [];
        res.on('data', (chunk) => { data.push(chunk); });
        res.on('end', () => {
          const buffer = Buffer.concat(data);
          resolve(buffer.toString('utf-8'));
        });
      });

      req.on('error', (e) => {
        reject(new Error(`请求失败: ${e.message}`));
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  /**
   * 1. 人民网时政新闻
   */
  async scrapePeopleDaily() {
    try {
      const html = await this.fetchUrl('http://politics.people.com.cn/GB/1024/index.html');
      console.log('[人民网] 页面获取成功，长度:', html.length);

      // 使用简单的正则表达式提取新闻标题和链接
      const news = [];
      const linkPattern = /<li><a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a><\/li>/g;
      let match;

      let count = 0;
      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2].trim();

        if (!url || url === '#' || !title) continue;

        // 处理相对URL
        const fullUrl = url.startsWith('http') ? url : `http://politics.people.com.cn${url}`;

        // 提取时间
        const dateMatch = url.match(/(\d{4})(\d{2})(\d{2})/);
        const publishedAt = dateMatch
          ? new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3]).toISOString()
          : new Date().toISOString();

        news.push({
          id: 'people_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: title.substring(0, 200),
          content: title,
          publishedAt: publishedAt,
          sourceName: '人民网',
          category: '时政要闻',
          categorySlug: 'politics',
          importance: 4
        });

        count++;
      }

      console.log(`[人民网] 提取到 ${news.length} 条新闻`);
      return news.length > 0 ? news : this.getMockNews('人民网', 'politics');

    } catch (e) {
      console.error('[人民网] 抓取失败:', e.message);
      return this.getMockNews('人民网', 'politics');
    }
  }

  /**
   * 2. 新华社时政新闻
   */
  async scrapeXinhua() {
    try {
      const html = await this.fetchUrl('http://www.xinhuanet.com/politics/news_politics.htm');
      console.log('[新华社] 页面获取成功，长度:', html.length);

      const news = [];
      const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match;

      let count = 0;
      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2].trim();

        if (!url || url === '#' || !title || title.length > 150) continue;

        const fullUrl = url.startsWith('http') ? url : `http://www.xinhuanet.com${url}`;

        news.push({
          id: 'xinhua_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: title.substring(0, 200),
          content: title,
          publishedAt: new Date().toISOString(),
          sourceName: '新华社',
          category: '时政要闻',
          categorySlug: 'politics',
          importance: 5
        });

        count++;
      }

      console.log(`[新华社] 提取到 ${news.length} 条新闻`);
      return news.length > 0 ? news : this.getMockNews('新华社', 'politics');

    } catch (e) {
      console.error('[新华社] 抓取失败:', e.message);
      return this.getMockNews('新华社', 'politics');
    }
  }

  /**
   * 3. 央视新闻
   */
  async scrapeCCTV() {
    try {
      const html = await this.fetchUrl('https://news.cctv.com/politics');
      console.log('[央视新闻] 页面获取成功，长度:', html.length);

      const news = [];
      const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match;

      let count = 0;
      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2].trim();

        if (!url || url === '#' || !title || title.length > 150) continue;

        const fullUrl = url.startsWith('http') ? url : `https://news.cctv.com${url}`;

        news.push({
          id: 'cctv_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: title.substring(0, 200),
          content: title,
          publishedAt: new Date().toISOString(),
          sourceName: '央视新闻',
          category: '时政要闻',
          categorySlug: 'politics',
          importance: 4
        });

        count++;
      }

      console.log(`[央视新闻] 提取到 ${news.length} 条新闻`);
      return news.length > 0 ? news : this.getMockNews('央视新闻', 'politics');

    } catch (e) {
      console.error('[央视新闻] 抓取失败:', e.message);
      return this.getMockNews('央视新闻', 'politics');
    }
  }

  /**
   * 4. 证券时报
   */
  async scrapeStcn() {
    try {
      const html = await this.fetchUrl('http://www.stcn.com/');
      console.log('[证券时报] 页面获取成功，长度:', html.length);

      const news = [];
      const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match;

      let count = 0;
      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2].trim();

        if (!url || url === '#' || !title || title.length > 150) continue;

        const fullUrl = url.startsWith('http') ? url : `http://www.stcn.com${url}`;

        news.push({
          id: 'stcn_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: title.substring(0, 200),
          content: title,
          publishedAt: new Date().toISOString(),
          sourceName: '证券时报',
          category: '财经政策',
          categorySlug: 'finance',
          importance: 4
        });

        count++;
      }

      console.log(`[证券时报] 提取到 ${news.length} 条新闻`);
      return news.length > 0 ? news : this.getMockNews('证券时报', 'finance');

    } catch (e) {
      console.error('[证券时报] 抓取失败:', e.message);
      return this.getMockNews('证券时报', 'finance');
    }
  }

  /**
   * 5. 中国政府网政策发布
   */
  async scrapeGovCn() {
    try {
      const html = await this.fetchUrl('http://www.gov.cn/zhengce/zuixin/index.htm');
      console.log('[中国政府网] 页面获取成功，长度:', html.length);

      const news = [];
      const linkPattern = /<a[^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g;
      let match;

      let count = 0;
      while ((match = linkPattern.exec(html)) !== null && count < 10) {
        const url = match[1];
        const title = match[2].trim();

        if (!url || url === '#' || !title || title.length > 150) continue;

        const fullUrl = url.startsWith('http') ? url : `http://www.gov.cn${url}`;

        news.push({
          id: 'gov_' + Date.now() + '_' + count,
          title: title.substring(0, 100),
          url: fullUrl,
          description: title.substring(0, 200),
          content: title,
          publishedAt: new Date().toISOString(),
          sourceName: '中国政府网',
          category: '政策发布',
          categorySlug: 'policy',
          importance: 5
        });

        count++;
      }

      console.log(`[中国政府网] 提取到 ${news.length} 条新闻`);
      return news.length > 0 ? news : this.getMockNews('中国政府网', 'policy');

    } catch (e) {
      console.error('[中国政府网] 抓取失败:', e.message);
      return this.getMockNews('中国政府网', 'policy');
    }
  }

  /**
   * 聚合所有新闻源
   */
  async fetchAllSources() {
    console.log('[国内新闻] 开始抓取所有新闻源...');

    const results = await Promise.allSettled([
      this.scrapePeopleDaily(),
      this.scrapeXinhua(),
      this.scrapeCCTV(),
      this.scrapeStcn(),
      this.scrapeGovCn()
    ]);

    let allNews = [];
    results.forEach((result, index) => {
      const sources = ['人民网', '新华社', '央视新闻', '证券时报', '中国政府网'];
      if (result.status === 'fulfilled') {
        allNews = allNews.concat(result.value);
        console.log(`[国内新闻] ${sources[index]}: ${result.value.length} 条`);
      } else {
        console.error(`[国内新闻] ${sources[index]} 抓取失败:`, result.reason.message);
      }
    });

    // 按重要性降序、时间降序排序
    allNews.sort((a, b) => {
      if (b.importance !== a.importance) {
        return b.importance - a.importance;
      }
      return new Date(b.publishedAt) - new Date(a.publishedAt);
    });

    console.log(`[国内新闻] 总共获取到 ${allNews.length} 条新闻`);
    return allNews;
  }

  /**
   * 获取最新新闻（带缓存）
   */
  async getLatestNews() {
    const now = Date.now();
    if (now - this.lastFetch < this.cacheTimeout && this.cache.has('news')) {
      console.log('[国内新闻] 使用缓存数据');
      return this.cache.get('news');
    }

    console.log('[国内新闻] 抓取新数据...');
    const news = await this.fetchAllSources();

    if (!news || news.length === 0) {
      console.log('[国内新闻] 未获取到新闻，返回系统消息');
      return [{
        id: 'sys_' + Date.now(),
        title: '暂无新闻 - ' + new Date().toLocaleString('zh-CN'),
        url: '#',
        description: '国内新闻服务正在初始化',
        content: '暂无新闻',
        publishedAt: new Date().toISOString(),
        sourceName: '系统',
        category: '系统',
        categorySlug: 'system',
        importance: 1
      }];
    }

    // 更新缓存
    this.cache.set('news', news);
    this.lastFetch = now;

    return news;
  }

  /**
   * 获取模拟新闻数据（用于测试和降级）
   */
  getMockNews(source, category) {
    const now = new Date();
    const mockTemplates = {
      '人民网': [
        '全国人大会议审议重要法案',
        '国务院召开常务会议研究经济工作',
        '多部委联合发布促进经济发展政策',
        '地方政府积极推进重大项目建设',
        '国家重大科技专项取得突破',
        '民生保障政策持续完善'
      ],
      '新华社': [
        '中央经济工作会议精神解读',
        '国家发改委发布宏观经济政策',
        '央行发布最新货币政策报告',
        '财政部部署年度财政工作重点',
        '我国经济保持稳中向好态势',
        '高质量发展取得新进展'
      ],
      '央视新闻': [
        '新闻联播：国家领导人重要讲话',
        '央视快讯：重大国计民生政策发布',
        '特别报道：经济高质量发展新成就',
        '深度访谈：深化改革扩大开放',
        '专题报道：科技创新成果丰硕',
        '新闻调查：民生改善成效显著'
      ],
      '证券时报': [
        '证监会发布资本市场改革措施',
        '上交所完善交易制度提升市场效率',
        'A股市场政策红利持续释放',
        '券商看好市场长期投资价值',
        '上市公司质量稳步提升',
        '投资者保护制度不断完善'
      ],
      '中国政府网': [
        '国务院办公厅印发指导意见',
        '发改委：加快推进新型基础设施建设',
        '工信部：推动制造业数字化转型',
        '财政部：实施积极财政政策',
        '人民银行：保持流动性合理充裕',
        '各部委协同推进高质量发展'
      ]
    };

    const titles = mockTemplates[source] || mockTemplates['新华社'];
    const categoryMap = {
      'politics': '时政要闻',
      'finance': '财经政策',
      'policy': '政策发布'
    };

    return titles.map((title, index) => ({
      id: `${source.substring(0, 2)}_${Date.now()}_${index}`,
      title: title,
      url: '#',
      description: `来自${source}的最新${categoryMap[category] || '新闻'}`,
      content: title,
      publishedAt: new Date(now.getTime() - index * 3600000).toISOString(),
      sourceName: source,
      category: categoryMap[category] || '时政要闻',
      categorySlug: category,
      importance: source === '新华社' || source === '中国政府网' ? 5 : 4
    }));
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
    console.log('[国内新闻] 缓存已清除');
  }
}

module.exports = new DomesticNewsScraper();
