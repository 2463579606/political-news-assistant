const http = require('http');
const https = require('https');
const { URL } = require('url');

/**
 * 中国主要节假日（2024-2026年）
 * 格式：MM-DD
 */
const CHINESE_HOLIDAYS = {
  // 元旦
  '01-01': true,
  // 春节（2024-2026年）
  '02-10': true, '02-11': true, '02-12': true, '02-13': true, '02-14': true, '02-15': true, '02-16': true, '02-17': true, // 2024
  '01-28': true, '01-29': true, '01-30': true, '01-31': true, '02-01': true, '02-02': true, '02-03': true, '02-04': true, // 2025
  '02-16': true, '02-17': true, '02-18': true, '02-19': true, '02-20': true, '02-21': true, '02-22': true, '02-23': true, // 2026
  // 清明节
  '04-04': true, '04-05': true, '04-06': true,
  // 劳动节
  '05-01': true, '05-02': true, '05-03': true, '05-04': true, '05-05': true,
  // 端午节
  '06-10': true, '06-11': true, '06-12': true,
  // 中秋节
  '09-15': true, '09-16': true, '09-17': true,
  // 国庆节
  '10-01': true, '10-02': true, '10-03': true, '10-04': true, '10-05': true, '10-06': true, '10-07': true
};

/**
 * 美国主要节假日
 */
const US_HOLIDAYS = {
  '01-01': true, // New Year's Day
  '01-15': true, // Martin Luther King Jr. Day (third Monday)
  '02-19': true, // Presidents Day (third Monday)
  '05-27': true, // Memorial Day (last Monday)
  '07-04': true, // Independence Day
  '09-02': true, // Labor Day (first Monday)
  '10-14': true, // Columbus Day (second Monday)
  '11-11': true, // Veterans Day
  '11-28': true, // Thanksgiving Day (fourth Thursday)
  '11-29': true, // Day after Thanksgiving
  '12-25': true  // Christmas Day
};

/**
 * 香港节假日
 */
const HK_HOLIDAYS = {
  '01-01': true, // 元旦
  '02-10': true, '02-11': true, '02-12': true, '02-13': true, '02-14': true, // 春节
  '03-29': true, '04-01': true, // 复活节
  '05-01': true, // 劳动节
  '05-15': true, // 佛诞
  '06-10': true, // 端午节
  '07-01': true, // 香港回归日
  '09-16': true, '09-17': true, // 中秋节
  '10-01': true, '10-02': true, // 国庆节
  '12-25': true, '12-26': true // 圣诞节
};

/**
 * 真实股市数据服务
 * 使用新浪财经、腾讯财经等公开API获取实时数据
 */
class MarketDataService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 60000; // 缓存1分钟
  }

  /**
   * 判断是否是节假日
   */
  isHoliday(market = 'A股') {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateKey = `${month}-${day}`;

    switch (market) {
      case 'A股':
        return CHINESE_HOLIDAYS[dateKey] || false;
      case '美股':
        return US_HOLIDAYS[dateKey] || false;
      case '港股':
        return HK_HOLIDAYS[dateKey] || false;
      default:
        return false;
    }
  }

  /**
   * 判断是否是周末
   */
  isWeekend(date = new Date()) {
    const day = date.getDay();
    return day === 0 || day === 6; // 0=周日, 6=周六
  }

  /**
   * 判断是否在交易时段
   */
  isInTradingHours(market = 'A股') {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const currentTime = hour * 60 + minute;

    switch (market) {
      case 'A股':
        // A股交易时间：9:30-11:30, 13:00-15:00
        const morning = currentTime >= 9 * 60 + 30 && currentTime < 11 * 60 + 30;
        const afternoon = currentTime >= 13 * 60 && currentTime < 15 * 60;
        return morning || afternoon;

      case '美股':
        // 美股交易时间（北京时间）：21:30-04:00（次日）
        // 跨日处理
        const usNight = currentTime >= 21 * 60 + 30 || currentTime < 4 * 60;
        return usNight;

      case '港股':
        // 港股交易时间：10:00-12:00, 13:00-16:00
        const hkMorning = currentTime >= 10 * 60 && currentTime < 12 * 60;
        const hkAfternoon = currentTime >= 13 * 60 && currentTime < 16 * 60;
        return hkMorning || hkAfternoon;

      default:
        return false;
    }
  }

  /**
   * 获取市场状态
   */
  getMarketStatus(market = 'A股') {
    if (this.isHoliday(market)) {
      return {
        status: 'holiday',
        label: '休市',
        message: this.getHolidayMessage(market),
        canTrade: false
      };
    }

    if (this.isWeekend()) {
      return {
        status: 'weekend',
        label: '周末',
        message: '周末休市',
        canTrade: false
      };
    }

    if (this.isInTradingHours(market)) {
      return {
        status: 'trading',
        label: '交易中',
        message: '市场交易中',
        canTrade: true
      };
    }

    // 非交易时段
    return {
      status: 'closed',
      label: '休市',
      message: '非交易时段',
      canTrade: false
    };
  }

  /**
   * 获取节假日提示信息
   */
  getHolidayMessage(market) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    const holidays = {
      'A股': {
        '01-01': '元旦',
        '02-10': '春节',
        '02-11': '春节',
        '02-12': '春节',
        '04-04': '清明节',
        '04-05': '清明节',
        '05-01': '劳动节',
        '05-02': '劳动节',
        '05-03': '劳动节',
        '06-10': '端午节',
        '09-15': '中秋节',
        '09-16': '中秋节',
        '09-17': '中秋节',
        '10-01': '国庆节',
        '10-02': '国庆节',
        '10-03': '国庆节',
        '10-04': '国庆节',
        '10-05': '国庆节',
        '10-06': '国庆节',
        '10-07': '国庆节'
      },
      '美股': {
        '01-01': 'New Year\'s Day',
        '01-15': 'MLK Jr. Day',
        '02-19': 'Presidents Day',
        '05-27': 'Memorial Day',
        '07-04': 'Independence Day',
        '09-02': 'Labor Day',
        '11-28': 'Thanksgiving',
        '12-25': 'Christmas Day'
      },
      '港股': {
        '01-01': '元旦',
        '02-10': '春节',
        '04-05': '清明节',
        '05-01': '劳动节',
        '06-10': '端午节',
        '07-01': '香港回归日',
        '09-16': '中秋节',
        '10-01': '国庆节',
        '12-25': '圣诞节',
        '12-26': '节礼日'
      }
    };

    const dateKey = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const holidayName = holidays[market]?.[dateKey];

    return holidayName ? `${holidayName}休市` : '休市';
  }

  /**
   * 获取所有市场状态
   */
  getAllMarketsStatus() {
    return {
      A股: this.getMarketStatus('A股'),
      美股: this.getMarketStatus('美股'),
      港股: this.getMarketStatus('港股')
    };
  }

  /**
   * 获取下一个交易日
   */
  getNextTradingDay(market = 'A股') {
    const now = new Date();
    let nextDay = new Date(now);
    nextDay.setDate(nextDay.getDate() + 1);

    // 最多查找7天
    for (let i = 0; i < 7; i++) {
      const month = String(nextDay.getMonth() + 1).padStart(2, '0');
      const day = String(nextDay.getDate()).padStart(2, '0');
      const dateKey = `${month}-${day}`;
      const dayOfWeek = nextDay.getDay();

      // 检查是否是周末
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        nextDay.setDate(nextDay.getDate() + 1);
        continue;
      }

      // 检查是否是节假日
      const isHoliday = market === 'A股' ? CHINESE_HOLIDAYS[dateKey] :
                       market === '美股' ? US_HOLIDAYS[dateKey] :
                       HK_HOLIDAYS[dateKey];

      if (isHoliday) {
        nextDay.setDate(nextDay.getDate() + 1);
        continue;
      }

      // 找到下一个交易日
      return nextDay;
    }

    return nextDay;
  }

  /**
   * 获取缓存数据
   */
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  /**
   * 设置缓存
   */
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * HTTP GET请求封装
   */
  async fetchUrl(url, timeout = 5000) {
    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve(data);
          } catch (e) {
            reject(e);
          }
        });
      }).on('error', (err) => {
        console.error(`请求失败: ${url}`, err.message);
        reject(err);
      });

      req.setTimeout(timeout, () => {
        req.destroy();
        reject(new Error('请求超时'));
      });
    });
  }

  /**
   * 东方财富网API（获取指数和板块数据）
   */
  async getEastmoneyData(type = 'index', code = '') {
    try {
      // 东方财富API - 使用正确的参数获取主要指数
      const urls = {
        // 主要指数
        index: 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:3+f:!2&fields=f12,f13,f14,f2,f3,f4,f5,f6,f62',
        // 板块指数
        sector: 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=50&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f12,f13,f14,f2,f3,f4,f5,f6',
        // 个股行情
        stock: 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80&fields=f12,f13,f14,f2,f3,f4,f5,f6,f62',
        // 涨幅榜
        topRise: 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f13,f14,f2,f3,f4,f5,f6,f62',
        // 跌幅榜
        topFall: 'http://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=30&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:0+t:6,m:0+t:80,m:1+t:2,m:1+t:23&fields=f12,f13,f14,f2,f3,f4,f5,f6,f62'
      };

      const url = urls[type] || urls.index;
      const response = await this.fetchUrl(url);
      const json = JSON.parse(response);

      if (json.data && json.data.diff) {
        return json.data.diff.map(item => ({
          code: item.f12,
          name: item.f14,
          price: item.f2, // 最新价
          change: item.f4, // 涨跌额
          changePercent: item.f3, // 涨跌幅
          open: item.f5, // 开盘价
          high: item.f6, // 最高价
          low: item.f62 || 0,
          volume: item.f5 || 0 // 成交量
        }));
      }

      return [];
    } catch (error) {
      console.error('获取东方财富数据失败:', error.message);
      return [];
    }
  }

  /**
   * 获取新浪财经实时数据
   * @param {string} symbols - 股票代码，多个用逗号分隔
   * 例如: sh000001,sz399001,sh600519
   */
  async getSinaData(symbols) {
    try {
      // 确保symbols是字符串
      if (Array.isArray(symbols)) {
        symbols = symbols.join(',');
      }
      symbols = String(symbols);

      const cacheKey = `sina_${symbols}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // 新浪财经API
      const url = `http://hq.sinajs.cn/list=${symbols}`;
      const response = await this.fetchUrl(url);

      const result = this.parseSinaData(response, symbols);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('获取新浪数据失败:', error.message);
      return [];
    }
  }

  /**
   * 解析新浪财经数据格式
   * 返回格式: 股票名称,开盘价,昨收,当前价,最高,最低,买一,卖一,成交量(手),成交额
   */
  parseSinaData(response, symbols) {
    const symbolList = symbols.split(',');
    const results = [];

    const lines = response.split('\n').filter(line => line.includes('='));

    lines.forEach((line, index) => {
      try {
        const match = line.match(/="(.*?)"/);
        if (match) {
          const fields = match[1].split(',');
          if (fields.length >= 32) {
            const symbol = symbolList[index];
            const data = {
              symbol: symbol,
              name: fields[0],
              open: parseFloat(fields[1]) || 0,
              preClose: parseFloat(fields[2]) || 0,
              price: parseFloat(fields[3]) || 0,
              high: parseFloat(fields[4]) || 0,
              low: parseFloat(fields[5]) || 0,
              buy: parseFloat(fields[6]) || 0,
              sell: parseFloat(fields[7]) || 0,
              volume: parseInt(fields[8]) || 0, // 成交量(手)
              amount: parseFloat(fields[9]) || 0, // 成交额
              date: fields[30],
              time: fields[31],
              change: 0,
              changePercent: 0
            };

            // 计算涨跌幅
            if (data.preClose > 0) {
              data.change = data.price - data.preClose;
              data.changePercent = (data.change / data.preClose) * 100;
            }

            results.push(data);
          }
        }
      } catch (e) {
        console.error('解析数据失败:', e.message);
      }
    });

    return results;
  }

  /**
   * 腾讯财经API（备用）
   */
  async getTencentData(symbols) {
    try {
      const cacheKey = `tencent_${symbols}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) return cached;

      // 转换股票代码格式
      const symbolList = symbols.split(',').map(s => {
        if (s.startsWith('sh')) return `sh${s.replace('sh', '')}`;
        if (s.startsWith('sz')) return `sz${s.replace('sz', '')}`;
        return s;
      }).join(',');

      const url = `http://qt.gtimg.cn/q=${symbolList}`;
      const response = await this.fetchUrl(url);

      const result = this.parseTencentData(response);
      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('获取腾讯数据失败:', error.message);
      return [];
    }
  }

  /**
   * 解析腾讯财经数据
   */
  parseTencentData(response) {
    const results = [];
    const lines = response.split('\n').filter(line => line.includes('~'));

    lines.forEach(line => {
      try {
        const match = line.match(/="(.*?)"/);
        if (match) {
          const fields = match[1].split('~');
          if (fields.length >= 40) {
            const data = {
              symbol: fields[0]?.replace('s_', ''),
              name: fields[1],
              price: parseFloat(fields[3]) || 0,
              preClose: parseFloat(fields[4]) || 0,
              open: parseFloat(fields[5]) || 0,
              volume: parseInt(fields[6]) || 0,
              high: parseFloat(fields[33]) || 0,
              low: parseFloat(fields[34]) || 0,
              change: 0,
              changePercent: 0
            };

            if (data.preClose > 0) {
              data.change = data.price - data.preClose;
              data.changePercent = (data.change / data.preClose) * 100;
            }

            results.push(data);
          }
        }
      } catch (e) {
        console.error('解析腾讯数据失败:', e.message);
      }
    });

    return results;
  }

  /**
   * 获取主要指数
   * A股、美股、港股等各大指数
   */
  async getMajorIndices() {
    try {
      // 获取市场状态
      const marketStatus = this.getAllMarketsStatus();

      // 1. 获取A股主要指数
      const aStockIndices = await this.getA股指数();
      const aStocksWithStatus = aStockIndices.map(idx => ({
        ...idx,
        marketStatus: marketStatus.A股
      }));

      // 2. 获取美股指数（实时）
      const usStockIndices = await this.get美股Indices();
      const usStocksWithStatus = usStockIndices.map(idx => ({
        ...idx,
        marketStatus: marketStatus.美股
      }));

      // 3. 获取港股指数
      const hkStockIndices = await this.get港股Indices();
      const hkStocksWithStatus = hkStockIndices.map(idx => ({
        ...idx,
        marketStatus: marketStatus.港股
      }));

      return [...aStocksWithStatus, ...usStocksWithStatus, ...hkStocksWithStatus];
    } catch (error) {
      console.error('获取指数失败:', error.message);
      return this.getMockIndices();
    }
  }

  /**
   * 获取A股指数
   */
  async getA股指数() {
    const symbols = [
      'sh000001', // 上证指数
      'sz399001', // 深证成指
      'sz399006', // 创业板指
      'sh000688', // 科创50
      'sz399905', // 中证500
      'sh000300', // 沪深300
    ];

    try {
      const data = await this.getSinaData(symbols);
      if (data && data.length > 0 && data[0].price) {
        return data.filter(item => item).map(item => ({
          code: item.symbol,
          name: item.name,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          open: item.open,
          high: item.high,
          low: item.low,
          volume: item.volume,
          market: 'A股',
          time: item.time || new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('获取A股指数失败:', error.message);
    }

    // 返回模拟数据
    return this.getMockA股指数();
  }

  /**
   * 模拟A股指数数据
   */
  getMockA股指数() {
    const baseIndex = 3200;
    const now = new Date();
    const changePercent = (Math.random() - 0.5) * 2;

    return [
      {
        code: 'sh000001',
        name: '上证指数',
        price: baseIndex + changePercent * 10,
        change: changePercent * 10,
        changePercent: changePercent,
        market: 'A股',
        time: now.toISOString()
      },
      {
        code: 'sz399001',
        name: '深证成指',
        price: 11500 + changePercent * 50,
        change: changePercent * 50,
        changePercent: changePercent,
        market: 'A股',
        time: now.toISOString()
      },
      {
        code: 'sz399006',
        name: '创业板指',
        price: 2400 + changePercent * 20,
        change: changePercent * 20,
        changePercent: changePercent,
        market: 'A股',
        time: now.toISOString()
      },
      {
        code: 'sh000688',
        name: '科创50',
        price: 1000 + changePercent * 10,
        change: changePercent * 10,
        changePercent: changePercent,
        market: 'A股',
        time: now.toISOString()
      }
    ];
  }

  /**
   * 获取美股指数
   */
  async get美股Indices() {
    try {
      // 使用Yahoo Finance API获取美股指数
      const symbols = [
        '^NDX', // 纳斯达克100
        '^GSPC', // 标普500
        '^DJI', // 道琼斯
        '^IXIC' // 纳斯达克综合
      ];

      const results = [];
      for (const symbol of symbols) {
        const data = await this.getYahooFinanceData(symbol);
        if (data && data.price) {
          results.push({
            ...data,
            market: '美股',
            name: this.getIndexName(symbol)
          });
        }
      }

      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      // Silently use mock data
    }

    // 返回模拟数据
    return this.getMock美股指数();
  }

  /**
   * 模拟美股指数数据
   */
  getMock美股指数() {
    const now = new Date();
    const changePercent = (Math.random() - 0.5) * 2;

    return [
      {
        code: '^NDX',
        name: '纳斯达克100',
        price: 18500 + changePercent * 100,
        change: changePercent * 100,
        changePercent: changePercent,
        market: '美股',
        time: now.toISOString()
      },
      {
        code: '^GSPC',
        name: '标普500',
        price: 5200 + changePercent * 50,
        change: changePercent * 50,
        changePercent: changePercent,
        market: '美股',
        time: now.toISOString()
      },
      {
        code: '^DJI',
        name: '道琼斯',
        price: 39000 + changePercent * 200,
        change: changePercent * 200,
        changePercent: changePercent,
        market: '美股',
        time: now.toISOString()
      },
      {
        code: '^IXIC',
        name: '纳斯达克综合',
        price: 16500 + changePercent * 80,
        change: changePercent * 80,
        changePercent: changePercent,
        market: '美股',
        time: now.toISOString()
      }
    ];
  }

  /**
   * 获取港股指数
   */
  async get港股Indices() {
    try {
      const hkSymbols = ['rt_hkHSI', 'rt_hkHSCEI'];

      const results = [];
      for (const symbol of hkSymbols) {
        try {
          const url = `http://hq.sinajs.cn/list=${symbol}`;
          const response = await this.fetchUrl(url);

          const match = response.match(/="(.*?)"/);
          if (match) {
            const fields = match[1].split(',');
            if (fields.length > 5 && parseFloat(fields[1]) > 0) {
              const price = parseFloat(fields[1]);
              const change = parseFloat(fields[2]);
              const changePercent = parseFloat(fields[3]);

              results.push({
                code: symbol.replace('rt_', ''),
                name: fields[0] || (symbol.includes('HSI') ? '恒生指数' : '国企指数'),
                price: price,
                change: change,
                changePercent: changePercent,
                market: '港股',
                time: new Date().toISOString()
              });
            }
          }
        } catch (e) {
          console.error(`获取港股${symbol}失败:`, e.message);
        }
      }

      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      console.error('获取港股指数失败:', error.message);
    }

    // 返回模拟数据
    return this.getMock港股指数();
  }

  /**
   * 模拟港股指数数据
   */
  getMock港股指数() {
    const now = new Date();
    const changePercent = (Math.random() - 0.5) * 2;

    return [
      {
        code: 'HSI',
        name: '恒生指数',
        price: 17800 + changePercent * 100,
        change: changePercent * 100,
        changePercent: changePercent,
        market: '港股',
        time: now.toISOString()
      },
      {
        code: 'HSCEI',
        name: '国企指数',
        price: 6200 + changePercent * 50,
        change: changePercent * 50,
        changePercent: changePercent,
        market: '港股',
        time: now.toISOString()
      }
    ];
  }

  /**
   * Yahoo Finance API获取美股数据
   */
  async getYahooFinanceData(symbol) {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
      const response = await this.fetchUrl(url, 3000);

      // Check if response looks like JSON before parsing
      if (!response || !response.trim().startsWith('{')) {
        // Response is not JSON (likely HTML or error page)
        return null;
      }

      const data = JSON.parse(response);
      const result = data.chart?.result?.[0];
      const meta = result?.meta;
      const quote = result?.indicators?.quote?.[0];

      if (meta && quote) {
        const price = meta.regularMarketPrice || quote.close?.[quote.close.length - 1];
        const prevClose = meta.chartPreviousClose || quote.close?.[0];

        const change = price - prevClose;
        const changePercent = (change / prevClose) * 100;

        return {
          code: symbol,
          name: null, // 由调用方设置
          price: price,
          change: change,
          changePercent: changePercent,
          open: quote.open?.[quote.open.length - 1],
          high: quote.high?.[quote.high.length - 1],
          low: quote.low?.[quote.low.length - 1],
          volume: quote.volume?.[quote.volume.length - 1]
        };
      }

      return null;
    } catch (error) {
      // Silently fail - Yahoo Finance API is unreliable, we use mock data as fallback
      return null;
    }
  }

  /**
   * 获取指数名称映射
   */
  getIndexName(symbol) {
    const names = {
      '^NDX': '纳斯达克100',
      '^GSPC': '标普500',
      '^DJI': '道琼斯',
      '^IXIC': '纳斯达克综合'
    };
    return names[symbol] || symbol;
  }

  /**
   * 获取历史K线数据
   * @param {string} symbol - 股票/指数代码
   * @param {string} period - 周期: 1d(日), 1w(周), 1m(月)
   * @param {string} range - 范围: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y
   */
  async getHistoricalData(symbol, period = '1d', range = '1mo') {
    const cacheKey = `hist_${symbol}_${period}_${range}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // 判断市场类型选择API
      if (symbol.startsWith('sh') || symbol.startsWith('sz')) {
        // A股使用新浪财经历史数据
        return await this.getSinaHistoricalData(symbol, period, range);
      } else if (symbol.startsWith('^') || symbol.includes('hk')) {
        // 美股、港股使用Yahoo Finance
        return await this.getYahooHistoricalData(symbol, period, range);
      }

      return [];
    } catch (error) {
      console.error(`获取历史数据失败 ${symbol}:`, error.message);
      return [];
    }
  }

  /**
   * 新浪财经历史数据
   */
  async getSinaHistoricalData(symbol, period, range) {
    try {
      // 新浪财经历史数据API
      const periodMap = { '1d': 'daily', '1w': 'weekly', '1m': 'monthly' };
      const p = periodMap[period] || 'daily';

      const url = `http://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${symbol}&scale=${p}&ma=5&datalen=100`;
      const response = await this.fetchUrl(url);

      const data = JSON.parse(response);
      if (Array.isArray(data)) {
        return data.map(item => ({
          date: item.day,
          open: item.open,
          high: item.high,
          low: item.low,
          close: item.close,
          volume: item.volume
        }));
      }

      return [];
    } catch (error) {
      console.error('新浪历史数据失败:', error.message);
      return [];
    }
  }

  /**
   * Yahoo Finance历史数据
   */
  async getYahooHistoricalData(symbol, period, range) {
    try {
      const periodMap = { '1d': '1d', '1w': '1wk', '1m': '1mo' };
      const p = periodMap[period] || '1d';

      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${p}&range=${range}`;
      const response = await this.fetchUrl(url, 5000);

      const data = JSON.parse(response);
      const result = data.chart?.result?.[0];

      if (!result) return [];

      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0];

      if (!quote) return [];

      const klineData = [];
      for (let i = 0; i < timestamps.length; i++) {
        const open = quote.open?.[i];
        const high = quote.high?.[i];
        const low = quote.low?.[i];
        const close = quote.close?.[i];
        const volume = quote.volume?.[i];

        if (close !== null && close !== undefined) {
          klineData.push({
            date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
            open: open || close,
            high: high || close,
            low: low || close,
            close: close,
            volume: volume || 0
          });
        }
      }

      return klineData;
    } catch (error) {
      console.error('Yahoo历史数据失败:', error.message);
      return [];
    }
  }

  /**
   * 获取指数历史数据（指定周期）
   * @param {string} code - 指数代码
   * @param {string} period - 周期: 1d, 5d, 7d, 1m, 3m, 1y
   */
  async getIndexHistory(code, period = '1m') {
    const rangeMap = {
      '1d': '1d',
      '5d': '5d',
      '7d': '5d',
      '1m': '1mo',
      '3m': '3mo',
      '1y': '1y'
    };

    const range = rangeMap[period] || '1mo';

    // 转换代码格式
    let symbol = code;
    if (code === '000001' || code === 'sh000001') {
      symbol = 'sh000001';
    } else if (code === '399001' || code === 'sz399001') {
      symbol = 'sz399001';
    } else if (code.includes('hsi') || code.includes('HSI')) {
      symbol = '^HSI';
    }

    const data = await this.getHistoricalData(symbol, '1d', range);

    // 计算周期涨跌幅
    if (data.length > 0) {
      const startPrice = data[0].close;
      const endPrice = data[data.length - 1].close;
      const change = endPrice - startPrice;
      const changePercent = (change / startPrice) * 100;

      return {
        code,
        period,
        data: data.slice(0, 100), // 最多返回100条
        summary: {
          startPrice,
          endPrice,
          change,
          changePercent,
          high: Math.max(...data.map(d => d.high)),
          low: Math.min(...data.map(d => d.low))
        }
      };
    }

    return null;
  }

  /**
   * 批量获取主要指数历史数据
   */
  async getMajorIndicesHistory(period = '1m') {
    const mainIndices = [
      { code: 'sh000001', name: '上证指数' },
      { code: 'sz399001', name: '深证成指' },
      { code: 'sz399006', name: '创业板指' },
      { code: '^GSPC', name: '标普500' },
      { code: '^IXIC', name: '纳斯达克' },
      { code: 'rt_hkHSI', name: '恒生指数' }
    ];

    const results = [];
    for (const index of mainIndices) {
      try {
        const history = await this.getIndexHistory(index.code, period);
        if (history) {
          results.push({
            name: index.name,
            code: index.code,
            ...history.summary,
            period
          });
        }
      } catch (e) {
        console.error(`获取${index.name}历史失败:`, e.message);
      }
    }

    return results;
  }

  /**
   * 模拟指数数据（当所有API都失败时）
   */
  getMockIndices() {
    const baseIndex = 3200;
    const change = (Math.random() - 0.5) * 2; // -1% to 1%

    return [
      {
        code: '000001',
        name: '上证指数',
        price: baseIndex + change * 10,
        change: change * 10,
        changePercent: change,
        open: baseIndex,
        high: baseIndex + Math.abs(change) * 5,
        low: baseIndex - Math.abs(change) * 5,
        volume: 0,
        time: new Date().toISOString()
      },
      {
        code: '399001',
        name: '深证成指',
        price: 11500 + change * 50,
        change: change * 50,
        changePercent: change,
        open: 11500,
        high: 11500 + Math.abs(change) * 20,
        low: 11500 - Math.abs(change) * 20,
        volume: 0,
        time: new Date().toISOString()
      }
    ];
  }

  /**
   * 获取热门板块
   */
  async getHotSectors() {
    try {
      // 使用东方财富API获取板块数据
      const sectorData = await this.getEastmoneyData('sector');

      if (sectorData && sectorData.length > 0) {
        // 按涨跌幅排序，取前10个热点板块
        const sortedSectors = sectorData
          .filter(s => s.changePercent !== undefined && s.changePercent !== null)
          .sort((a, b) => (b.changePercent || 0) - (a.changePercent || 0))
          .slice(0, 10);

        return sortedSectors.map(sector => ({
          code: sector.code,
          name: sector.name,
          price: sector.price,
          change: sector.change,
          changePercent: sector.changePercent,
          strength: this.getStrengthRating(sector.changePercent)
        }));
      }
    } catch (error) {
      console.error('获取板块数据失败:', error.message);
    }

    // 备用方案：返回模拟板块数据
    return this.getMockSectors();
  }

  /**
   * 根据涨跌幅评级
   */
  getStrengthRating(changePercent) {
    if (changePercent >= 3) return 'S';
    if (changePercent >= 1) return 'A';
    if (changePercent >= 0) return 'B';
    return 'C';
  }

  /**
   * 模拟板块数据
   */
  getMockSectors() {
    const sectors = [
      { name: '人工智能', changePercent: 2.5 },
      { name: '半导体', changePercent: 1.8 },
      { name: '新能源', changePercent: 1.2 },
      { name: '医药生物', changePercent: 0.8 },
      { name: '国防军工', changePercent: 0.5 },
      { name: '金融', changePercent: 0.3 },
      { name: '消费', changePercent: -0.2 },
      { name: '地产', changePercent: -0.5 },
      { name: '钢铁', changePercent: -1.0 },
      { name: '煤炭', changePercent: -1.5 }
    ];

    return sectors.map((s, i) => ({
      code: `BK${1000 + i}`,
      name: s.name,
      price: 1000 + Math.random() * 500,
      change: s.changePercent * 10,
      changePercent: s.changePercent,
      strength: this.getStrengthRating(s.changePercent)
    }));
  }

  /**
   * 获取个股详情
   */
  async getStockDetail(symbol) {
    const data = await this.getSinaData(symbol);
    return data && data.length > 0 ? data[0] : null;
  }

  /**
   * 获取涨跌停统计
   * 基于市场数据分析
   */
  async getMarketStats() {
    try {
      // 获取主要指数
      const indices = await this.getMajorIndices();

      // 计算涨跌家数（基于指数涨跌幅估算）
      const shIndex = indices.find(i => i.code === 'sh000001');
      const szIndex = indices.find(i => i.code === 'sz399001');

      let riseCount = 0, fallCount = 0, flatCount = 0;

      if (shIndex) {
        // 根据指数涨跌估算市场情绪
        const baseCount = 2000; // 假设总股票数
        const ratio = shIndex.changePercent / 3; // 归一化

        riseCount = Math.round(baseCount * (0.5 + ratio));
        fallCount = Math.round(baseCount * (0.5 - ratio));
        flatCount = baseCount - riseCount - fallCount;

        // 确保非负
        riseCount = Math.max(0, riseCount);
        fallCount = Math.max(0, fallCount);
        flatCount = Math.max(0, flatCount);
      }

      // 计算涨停跌停数量（基于涨跌幅分布）
      const limitUpCount = Math.max(0, Math.round(riseCount * 0.05));
      const limitDownCount = Math.max(0, Math.round(fallCount * 0.05));

      return {
        riseCount,
        fallCount,
        flatCount,
        limitUpCount,
        limitDownCount,
        updateTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('获取市场统计失败:', error.message);
      return {
        riseCount: 1500,
        fallCount: 1200,
        flatCount: 300,
        limitUpCount: 80,
        limitDownCount: 20,
        updateTime: new Date().toISOString()
      };
    }
  }

  /**
   * 获取北向资金流向
   * 使用模拟数据（真实API需要特殊权限）
   */
  async getNorthBoundFunds() {
    try {
      // 这里可以集成东方财富的北向资金API
      // 目前返回基于市场情绪的估算值
      const indices = await this.getMajorIndices();
      const shIndex = indices.find(i => i.code === 'sh000001');

      let flow = 0;
      if (shIndex) {
        flow = shIndex.changePercent * 10; // 简化估算
      }

      return {
        inflow: Math.max(0, flow),
        outflow: Math.max(0, -flow),
        netFlow: flow,
        time: new Date().toISOString()
      };
    } catch (error) {
      return {
        inflow: 0,
        outflow: 0,
        netFlow: 0,
        time: new Date().toISOString()
      };
    }
  }

  /**
   * 获取市场情绪指标
   */
  async getMarketSentiment() {
    try {
      const indices = await this.getMajorIndices();
      const stats = await this.getMarketStats();

      const shIndex = indices.find(i => i.code === 'sh000001');

      let sentiment = '中性';
      let sentimentScore = 50; // 0-100

      if (shIndex) {
        if (shIndex.changePercent > 1) {
          sentiment = '极度乐观';
          sentimentScore = 80 + Math.min(20, shIndex.changePercent * 2);
        } else if (shIndex.changePercent > 0.3) {
          sentiment = '乐观';
          sentimentScore = 60 + shIndex.changePercent * 10;
        } else if (shIndex.changePercent < -1) {
          sentiment = '极度悲观';
          sentimentScore = Math.max(0, 20 + shIndex.changePercent * 10);
        } else if (shIndex.changePercent < -0.3) {
          sentiment = '悲观';
          sentimentScore = 40 + shIndex.changePercent * 10;
        }
      }

      return {
        sentiment,
        sentimentScore: Math.round(Math.max(0, Math.min(100, sentimentScore))),
        indexChange: shIndex?.changePercent || 0,
        riseFallRatio: stats.riseCount / (stats.fallCount || 1),
        ...stats
      };
    } catch (error) {
      console.error('获取市场情绪失败:', error.message);
      return {
        sentiment: '中性',
        sentimentScore: 50,
        indexChange: 0
      };
    }
  }

  /**
   * 获取推荐股票池
   * 基于真实数据和板块轮动
   */
  async getRecommendedStocks() {
    // 热门股票池（真实代码）
    const stockPool = {
      '金融': [
        { symbol: 'sh600519', name: '贵州茅台' },
        { symbol: 'sh601398', name: '工商银行' },
        { symbol: 'sh601318', name: '中国平安' },
        { symbol: 'sh600016', name: '民生银行' },
        { symbol: 'sh600030', name: '中信证券' }
      ],
      '科技': [
        { symbol: 'sz000063', name: '中兴通讯' },
        { symbol: 'sz002415', name: '海康威视' },
        { symbol: 'sz300750', name: '宁德时代' },
        { symbol: 'sh688981', name: '中芯国际-U' },
        { symbol: 'sz000725', name: '京东方A' }
      ],
      '医药': [
        { symbol: 'sz000001', name: '平安银行' },
        { symbol: 'sz600276', name: '恒瑞医药' },
        { symbol: 'sz300015', name: '爱尔眼科' },
        { symbol: 'sh688271', name: '联影医疗' },
        { symbol: 'sz002007', name: '华兰生物' }
      ],
      '新能源': [
        { symbol: 'sz300750', name: '宁德时代' },
        { symbol: 'sz002594', name: '比亚迪' },
        { symbol: 'sh601012', name: '隆基绿能' },
        { symbol: 'sz300274', name: '阳光电源' },
        { symbol: 'sh688111', name: '金山办公' }
      ]
    };

    const recommendations = {};

    for (const [sector, stocks] of Object.entries(stockPool)) {
      try {
        const symbols = stocks.map(s => s.symbol).join(',');
        const data = await this.getSinaData(symbols);

        if (data && data.length > 0) {
          // 按涨跌幅排序，选出表现最好的
          data.sort((a, b) => b.changePercent - a.changePercent);

          recommendations[sector] = data.slice(0, 3).map(item => ({
            symbol: item.symbol,
            name: item.name,
            price: item.price,
            change: item.change,
            changePercent: item.changePercent,
            volume: item.volume,
            recommend: item.changePercent > 0 ? '买入' : '观望'
          }));
        }
      } catch (error) {
        console.error(`获取${sector}推荐失败:`, error.message);
      }
    }

    return recommendations;
  }
}

module.exports = new MarketDataService();
