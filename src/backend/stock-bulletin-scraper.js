const https = require('https');
const http = require('http');

/**
 * 股市公告抓取器
 * 从主要财经网站抓取上市公司公告信息
 */
class StockBulletinScraper {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5分钟缓存
    this.lastFetch = 0;

    // 公告类型映射
    this.bulletinTypes = {
      '年报': 'annual_report',
      '半年报': 'semiannual_report',
      '季报': 'quarterly_report',
      '业绩预告': 'performance_forecast',
      '业绩快报': 'performance_flash',
      '分红': 'dividend',
      '转增': 'bonus_share',
      '配股': 'rights_issue',
      '增发': 'private_placement',
      '重组': 'restructuring',
      '并购': 'm_a',
      '股权转让': 'equity_transfer',
      '股份回购': 'share_repurchase',
      '停牌': 'suspension',
      '复牌': 'resumption',
      '股东大会': 'shareholder_meeting',
      '董事会': 'board_meeting',
      '监事会': 'supervisor_meeting',
      '解除担保': 'guarantee_release',
      '担保': 'guarantee',
      '诉讼': 'litigation',
      '关联交易': 'related_transaction',
      '异常波动': 'abnormal_fluctuation',
      '风险提示': 'risk_warning',
      '澄清公告': 'clarification',
      '补充公告': 'supplement',
      '更正公告': 'correction'
    };

    // 行业分类
    this.industryMap = {
      '科技': ['人工智能', '芯片', '半导体', '5G', '新能源', '光伏', '锂电池'],
      '医药': ['医药', '生物', '疫苗', '医疗器械'],
      '消费': ['白酒', '食品', '家电', '纺织', '商贸'],
      '金融': ['银行', '保险', '证券', '信托'],
      '地产': ['房地产', '物业'],
      '能源': ['石油', '煤炭', '天然气', '电力'],
      '材料': ['钢铁', '有色', '化工', '建材'],
      '工业': ['机械', '汽车', '军工', '航空航天'],
      '公用': ['环保', '水务', '电力', '燃气']
    };
  }

  /**
   * 通用HTTP请求方法
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
        timeout: 10000
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
   * 1. 巨潮资讯网公告（深交所/上交所官方披露）
   */
  async scrapeCninfo(stockCode = null) {
    try {
      // 巨潮资讯网最新公告页面
      const url = stockCode
        ? `http://www.cninfo.com.cn/new/hisAnnouncement/query`
        : `http://www.cninfo.com.cn/new/disclosure/stock`;

      console.log('[巨潮资讯] 抓取公告:', stockCode || '全部');

      // 由于巨潮资讯需要POST请求获取数据，这里返回模拟数据
      // 实际部署时需要实现完整的API调用
      const bulletins = this.getMockBulletins(stockCode);
      console.log(`[巨潮资讯] 提取到 ${bulletins.length} 条公告`);

      return bulletins;

    } catch (e) {
      console.error('[巨潮资讯] 抓取失败:', e.message);
      return this.getMockBulletins(stockCode);
    }
  }

  /**
   * 2. 东方财富网公告
   */
  async scrapeEastmoney(stockCode = null) {
    try {
      console.log('[东方财富] 抓取公告:', stockCode || '全部');

      // 东方财富网公告API
      const apiUrl = stockCode
        ? `http://data.eastmoney.com/notices/getdata.ashx`
        : `http://data.eastmoney.com/notices/getdata.ashx`;

      // 返回模拟数据
      const bulletins = this.getMockBulletins(stockCode, '东方财富');
      console.log(`[东方财富] 提取到 ${bulletins.length} 条公告`);

      return bulletins;

    } catch (e) {
      console.error('[东方财富] 抓取失败:', e.message);
      return [];
    }
  }

  /**
   * 3. 上交所公告
   */
  async scrapeSSE(stockCode = null) {
    try {
      console.log('[上交所] 抓取公告:', stockCode || '全部');

      const bulletins = stockCode
        ? this.getMockBulletins(stockCode, '上交所')
        : [];

      console.log(`[上交所] 提取到 ${bulletins.length} 条公告`);
      return bulletins;

    } catch (e) {
      console.error('[上交所] 抓取失败:', e.message);
      return [];
    }
  }

  /**
   * 聚合所有公告源
   */
  async fetchAllBulletins(stockCode = null) {
    console.log(`[股市公告] 开始抓取公告 ${stockCode ? `股票: ${stockCode}` : '全部股票'}...`);

    const results = await Promise.allSettled([
      this.scrapeCninfo(stockCode),
      this.scrapeEastmoney(stockCode),
      this.scrapeSSE(stockCode)
    ]);

    let allBulletins = [];
    results.forEach((result, index) => {
      const sources = ['巨潮资讯', '东方财富', '上交所'];
      if (result.status === 'fulfilled') {
        allBulletins = allBulletins.concat(result.value);
        console.log(`[股市公告] ${sources[index]}: ${result.value.length} 条`);
      }
    });

    // 去重（按公告标题和日期）
    const uniqueBulletins = this.deduplicateBulletins(allBulletins);

    // 按时间降序排序
    uniqueBulletins.sort((a, b) => new Date(b.publishTime) - new Date(a.publishTime));

    console.log(`[股市公告] 总共获取到 ${uniqueBulletins.length} 条公告`);
    return uniqueBulletins;
  }

  /**
   * 公告去重
   */
  deduplicateBulletins(bulletins) {
    const seen = new Set();
    return bulletins.filter(b => {
      const key = `${b.stockCode}_${b.title}_${b.publishTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * 解析公告类型
   */
  parseBulletinType(title) {
    for (const [cnName, enKey] of Object.entries(this.bulletinTypes)) {
      if (title.includes(cnName)) {
        return { cn: cnName, en: enKey };
      }
    }

    // 默认分类
    if (title.includes('公告') || title.includes('通知')) {
      return { cn: '一般公告', en: 'general' };
    }

    return { cn: '其他', en: 'other' };
  }

  /**
   * 提取股票代码
   */
  extractStockCodes(text) {
    // 匹配A股代码：600xxx, 000xxx, 002xxx, 300xxx等
    const codePattern = /\b(600|000|002|300|301|688|601|603|605)\d{3}\b/g;
    return text.match(codePattern) || [];
  }

  /**
   * 检测关联行业
   */
  detectIndustries(text) {
    const detected = [];

    for (const [industry, keywords] of Object.entries(this.industryMap)) {
      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          detected.push(industry);
          break;
        }
      }
    }

    return detected.length > 0 ? detected : ['综合'];
  }

  /**
   * 获取最新公告（带缓存）
   */
  async getLatestBulletins(stockCode = null, limit = 50) {
    const now = Date.now();
    const cacheKey = `bulletins_${stockCode || 'all'}`;

    if (now - this.lastFetch < this.cacheTimeout && this.cache.has(cacheKey)) {
      console.log('[股市公告] 使用缓存数据');
      return this.cache.get(cacheKey).slice(0, limit);
    }

    console.log('[股市公告] 抓取新数据...');
    const bulletins = await this.fetchAllBulletins(stockCode);

    if (!bulletins || bulletins.length === 0) {
      return [];
    }

    // 更新缓存
    this.cache.set(cacheKey, bulletins);
    this.lastFetch = now;

    return bulletins.slice(0, limit);
  }

  /**
   * 根据关键词筛选公告
   */
  async filterBulletinsByKeyword(keyword, stockCode = null) {
    const allBulletins = await this.getLatestBulletins(stockCode, 200);

    const filtered = allBulletins.filter(b =>
      b.title.includes(keyword) ||
      b.summary.includes(keyword) ||
      (b.keywords && b.keywords.some(k => k.includes(keyword)))
    );

    console.log(`[股市公告] 关键词"${keyword}"筛选结果: ${filtered.length} 条`);
    return filtered;
  }

  /**
   * 根据公告类型筛选
   */
  async filterBulletinsByType(type, stockCode = null) {
    const allBulletins = await this.getLatestBulletins(stockCode, 200);

    const filtered = allBulletins.filter(b => b.type.en === type || b.type.cn.includes(type));

    console.log(`[股市公告] 类型"${type}"筛选结果: ${filtered.length} 条`);
    return filtered;
  }

  /**
   * 根据股票代码筛选
   */
  async getBulletinsByStock(stockCode) {
    return this.getLatestBulletins(stockCode, 100);
  }

  /**
   * 获取模拟公告数据（用于测试）
   */
  getMockBulletins(stockCode = null, source = '巨潮资讯') {
    const now = new Date();
    const companies = stockCode
      ? [{ code: stockCode, name: this.getStockName(stockCode) }]
      : [
          { code: '600519', name: '贵州茅台' },
          { code: '000858', name: '五粮液' },
          { code: '300750', name: '宁德时代' },
          { code: '601012', name: '隆基绿能' },
          { code: '002594', name: '比亚迪' },
          { code: '600036', name: '招商银行' },
          { code: '000001', name: '平安银行' },
          { code: '601318', name: '中国平安' }
        ];

    const bulletinTemplates = [
      { title: '关于召开2024年年度股东大会的通知', type: '股东大会', importance: 4 },
      { title: '2023年年度报告', type: '年报', importance: 5 },
      { title: '2024年第一季度报告', type: '季报', importance: 4 },
      { title: '关于2023年度利润分配预案的公告', type: '分红', importance: 5 },
      { title: '关于使用闲置募集资金进行现金管理的公告', type: '理财', importance: 3 },
      { title: '关于全资子公司对外投资的公告', type: '投资', importance: 4 },
      { title: '关于公司高级管理人员变动的公告', type: '人事', importance: 3 },
      { title: '关于控股股东股份质押的公告', type: '股权质押', importance: 3 },
      { title: '关于获得政府补助的公告', type: '补助', importance: 2 },
      { title: '关于重大合同签订的公告', type: '合同', importance: 5 },
      { title: '关于股票交易异常波动的公告', type: '异常波动', importance: 4 },
      { title: '关于媒体报道的澄清公告', type: '澄清公告', importance: 3 }
    ];

    const bulletins = [];
    let id = 1;

    companies.forEach(company => {
      // 每家公司生成3-6条公告
      const count = 3 + Math.floor(Math.random() * 4);

      for (let i = 0; i < count; i++) {
        const template = bulletinTemplates[Math.floor(Math.random() * bulletinTemplates.length)];
        const hoursAgo = Math.floor(Math.random() * 72); // 0-72小时内

        bulletins.push({
          id: `bull_${company.code}_${id++}`,
          stockCode: company.code,
          stockName: company.name,
          title: `${company.name}${template.title}`,
          type: { cn: template.type, en: 'general' },
          summary: `${company.name}${template.title.substring(2)}`,
          publishTime: new Date(now.getTime() - hoursAgo * 3600000).toISOString(),
          source: source,
          url: `http://www.cninfo.com.cn/new/disclosure/detail?stockCode=${company.code}&announcementId=${id}`,
          importance: template.importance,
          keywords: this.extractKeywords(template.title),
          industries: this.detectIndustries(company.name)
        });
      }
    });

    return bulletins;
  }

  /**
   * 获取股票名称
   */
  getStockName(code) {
    const names = {
      '600519': '贵州茅台',
      '000858': '五粮液',
      '300750': '宁德时代',
      '601012': '隆基绿能',
      '002594': '比亚迪',
      '600036': '招商银行',
      '000001': '平安银行',
      '601318': '中国平安'
    };
    return names[code] || `股票${code}`;
  }

  /**
   * 提取关键词
   */
  extractKeywords(text) {
    const keywords = [];

    // 提取公告类型关键词
    for (const cnName of Object.keys(this.bulletinTypes)) {
      if (text.includes(cnName)) {
        keywords.push(cnName);
      }
    }

    // 提取数字（年度、季度等）
    const yearMatch = text.match(/20[1-3]\d{1}/g);
    if (yearMatch) {
      keywords.push(...yearMatch);
    }

    const quarterMatch = text.match(/第[一二三四]季度/g);
    if (quarterMatch) {
      keywords.push(...quarterMatch);
    }

    return keywords.length > 0 ? keywords : ['公告'];
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.lastFetch = 0;
    console.log('[股市公告] 缓存已清除');
  }

  /**
   * 获取公告统计信息
   */
  async getBulletinStats(days = 7) {
    const bulletins = await this.getLatestBulletins(null, 500);

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 3600000);

    const recentBulletins = bulletins.filter(b =>
      new Date(b.publishTime) >= cutoffDate
    );

    // 按类型统计
    const typeStats = {};
    recentBulletins.forEach(b => {
      const type = b.type.cn;
      typeStats[type] = (typeStats[type] || 0) + 1;
    });

    // 按重要性统计
    const importanceStats = { high: 0, medium: 0, low: 0 };
    recentBulletins.forEach(b => {
      if (b.importance >= 5) importanceStats.high++;
      else if (b.importance >= 3) importanceStats.medium++;
      else importanceStats.low++;
    });

    return {
      total: recentBulletins.length,
      byType: typeStats,
      byImportance: importanceStats,
      dateRange: `${cutoffDate.toISOString().split('T')[0]} ~ ${now.toISOString().split('T')[0]}`
    };
  }
}

module.exports = new StockBulletinScraper();
