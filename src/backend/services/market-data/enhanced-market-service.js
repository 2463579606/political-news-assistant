/**
 * Enhanced Market Service
 * 增强的行情数据服务
 *
 * 功能：
 * 1. 接入Tushare API获取K线数据
 * 2. 计算技术指标（MA、MACD、RSI、KDJ、BOLL）
 * 3. 存储到PostgreSQL数据库
 * 4. 提供查询接口
 */

const tushare = require('tushare');
const { Pool } = require('pg');

class EnhancedMarketService {
  constructor() {
    // Tushare初始化
    this.ts = tushare;
    const tsToken = process.env.TUSHARE_TOKEN;
    if (tsToken) {
      this.ts.set_token(tsToken);
      this.pro = this.ts.pro_api();
    } else {
      console.warn('⚠️  TUSHARE_TOKEN not set in environment variables');
    }

    // PostgreSQL连接池
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 获取日K线数据
   * @param {string} stockCode - 股票代码，如 '000001.SZ'
   * @param {string} startDate - 开始日期，如 '20240101'
   * @param {string} endDate - 结束日期，如 '20241231'
   * @param {number} limit - 限制条数，默认200
   */
  async getDailyK(stockCode, startDate, endDate, limit = 200) {
    try {
      if (!this.pro) {
        throw new Error('Tushare API not initialized. Please set TUSHARE_TOKEN.');
      }

      // 调用Tushare API
      const df = await this.pro.daily(
        ts_code = stockCode,
        start_date = startDate,
        end_date = endDate
      );

      // 转换数据格式
      const klines = df.map(row => ({
        stockCode: row.ts_code,
        tradeDate: row.trade_date,
        openPrice: parseFloat(row.open),
        closePrice: parseFloat(row.close),
        highPrice: parseFloat(row.high),
        lowPrice: parseFloat(row.low),
        volume: parseInt(row.vol),
        amount: parseFloat(row.amount)
      }));

      // 限制返回条数
      return klines.slice(-limit);

    } catch (error) {
      console.error(`获取日K数据失败: ${stockCode}`, error.message);
      throw error;
    }
  }

  /**
   * 计算移动平均线 MA
   * @param {Array} prices - 价格数组
   * @param {number} period - 周期
   */
  calculateMA(prices, period) {
    const result = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        result.push(null);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        result.push(+(sum / period).toFixed(2));
      }
    }
    return result;
  }

  /**
   * 计算MACD
   * @param {Array} prices - 收盘价数组
   * @param {number} fastPeriod - 快线周期，默认12
   * @param {number} slowPeriod - 慢线周期，默认26
   * @param {number} signalPeriod - 信号线周期，默认9
   */
  calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // 计算EMA
    const calculateEMA = (prices, period) => {
      const result = [];
      const multiplier = 2 / (period + 1);

      // 第一个EMA值使用SMA
      let ema = prices.slice(0, period).reduce((a, b) => a + b, 0) / period;
      result.push(ema);

      for (let i = period; i < prices.length; i++) {
        ema = (prices[i] - ema) * multiplier + ema;
        result.push(ema);
      }

      return result;
    };

    const emaFast = calculateEMA(prices, fastPeriod);
    const emaSlow = calculateEMA(prices, slowPeriod);

    // 计算DIF (快线 - 慢线)
    const dif = [];
    const offset = slowPeriod - fastPeriod;
    for (let i = 0; i < emaSlow.length; i++) {
      dif.push(emaFast[i + offset] - emaSlow[i]);
    }

    // 计算DEA (DIF的EMA)
    const dea = calculateEMA(dif, signalPeriod);

    // 计算MACD柱 (DIF - DEA) * 2
    const macd = [];
    for (let i = 0; i < dif.length; i++) {
      if (i < signalPeriod - 1) {
        macd.push(null);
      } else {
        macd.push(+((dif[i] - dea[i - signalPeriod + 1]) * 2).toFixed(2));
      }
    }

    return {
      macd: macd.map(v => v === null ? null : +v.toFixed(2)),
      signal: dea.map(v => v === null ? null : +v.toFixed(2)),
      hist: macd
    };
  }

  /**
   * 计算RSI (相对强弱指标)
   * @param {Array} prices - 收盘价数组
   * @param {number} period - 周期，默认6
   */
  calculateRSI(prices, period = 6) {
    const rsi = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period) {
        rsi.push(null);
        continue;
      }

      let gains = 0;
      let losses = 0;

      for (let j = i - period + 1; j <= i; j++) {
        const change = prices[j] - prices[j - 1];
        if (change > 0) {
          gains += change;
        } else {
          losses += Math.abs(change);
        }
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(+(100 - 100 / (1 + rs)).toFixed(2));
      }
    }

    return rsi;
  }

  /**
   * 计算KDJ
   * @param {Array} highs - 最高价数组
   * @param {Array} lows - 最低价数组
   * @param {Array} closes - 收盘价数组
   * @param {number} period - 周期，默认9
   */
  calculateKDJ(highs, lows, closes, period = 9, m1 = 3, m2 = 3) {
    const k = [];
    const d = [];
    const j = [];

    let prevK = 50;
    let prevD = 50;

    for (let i = 0; i < closes.length; i++) {
      if (i < period - 1) {
        k.push(null);
        d.push(null);
        j.push(null);
        continue;
      }

      const high = Math.max(...highs.slice(i - period + 1, i + 1));
      const low = Math.min(...lows.slice(i - period + 1, i + 1));

      const rsv = ((closes[i] - low) / (high - low)) * 100;

      const currentK = (2 / 3) * prevK + (1 / 3) * rsv;
      const currentD = (2 / 3) * prevD + (1 / 3) * currentK;
      const currentJ = 3 * currentK - 2 * currentD;

      k.push(+currentK.toFixed(2));
      d.push(+currentD.toFixed(2));
      j.push(+currentJ.toFixed(2));

      prevK = currentK;
      prevD = currentD;
    }

    return { k, d, j };
  }

  /**
   * 计算布林带 BOLL
   * @param {Array} prices - 收盘价数组
   * @param {number} period - 周期，默认20
   * @param {number} stdDev - 标准差倍数，默认2
   */
  calculateBOLL(prices, period = 20, stdDev = 2) {
    const upper = [];
    const mid = [];
    const lower = [];

    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        upper.push(null);
        mid.push(null);
        lower.push(null);
        continue;
      }

      const slice = prices.slice(i - period + 1, i + 1);
      const ma = slice.reduce((a, b) => a + b, 0) / period;

      const variance = slice.reduce((sum, val) => sum + Math.pow(val - ma, 2), 0) / period;
      const sd = Math.sqrt(variance);

      mid.push(+ma.toFixed(2));
      upper.push(+(ma + stdDev * sd).toFixed(2));
      lower.push(+(ma - stdDev * sd).toFixed(2));
    }

    return { upper, mid, lower };
  }

  /**
   * 计算所有技术指标
   * @param {Array} klines - K线数据数组
   */
  async calculateIndicators(klines) {
    if (!klines || klines.length === 0) {
      return [];
    }

    const closes = klines.map(k => k.closePrice);
    const highs = klines.map(k => k.highPrice);
    const lows = klines.map(k => k.lowPrice);

    // 计算各项指标
    const ma5 = this.calculateMA(closes, 5);
    const ma10 = this.calculateMA(closes, 10);
    const ma20 = this.calculateMA(closes, 20);
    const ma60 = this.calculateMA(closes, 60);

    const macd = this.calculateMACD(closes);
    const rsi6 = this.calculateRSI(closes, 6);
    const rsi12 = this.calculateRSI(closes, 12);
    const rsi24 = this.calculateRSI(closes, 24);

    const kdj = this.calculateKDJ(highs, lows, closes);

    const boll = this.calculateBOLL(closes);

    // 组合数据
    return klines.map((kline, i) => ({
      ...kline,
      ma5: ma5[i],
      ma10: ma10[i],
      ma20: ma20[i],
      ma60: ma60[i],
      macd: macd.macd[i],
      macdSignal: macd.signal[i],
      macdHist: macd.hist[i],
      rsi6: rsi6[i],
      rsi12: rsi12[i],
      rsi24: rsi24[i],
      kdjK: kdj.k[i],
      kdjD: kdj.d[i],
      kdjJ: kdj.j[i],
      bollUpper: boll.upper[i],
      bollMid: boll.mid[i],
      bollLower: boll.lower[i]
    }));
  }

  /**
   * 保存行情数据到数据库
   * @param {Array} marketData - 包含技术指标的行情数据
   */
  async saveToDatabase(marketData) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO market_data (
          stock_code, stock_name, trade_date, open_price, close_price, high_price, low_price, volume, amount,
          ma5, ma10, ma20, ma60,
          macd, macd_signal, macd_hist,
          rsi6, rsi12, rsi24,
          kdj_k, kdj_d, kdj_j,
          boll_upper, boll_mid, boll_lower
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        ON CONFLICT (stock_code, trade_date) DO UPDATE SET
          open_price = EXCLUDED.open_price,
          close_price = EXCLUDED.close_price,
          high_price = EXCLUDED.high_price,
          low_price = EXCLUDED.low_price,
          volume = EXCLUDED.volume,
          amount = EXCLUDED.amount,
          ma5 = EXCLUDED.ma5,
          ma10 = EXCLUDED.ma10,
          ma20 = EXCLUDED.ma20,
          ma60 = EXCLUDED.ma60,
          macd = EXCLUDED.macd,
          macd_signal = EXCLUDED.macd_signal,
          macd_hist = EXCLUDED.macd_hist,
          rsi6 = EXCLUDED.rsi6,
          rsi12 = EXCLUDED.rsi12,
          rsi24 = EXCLUDED.rsi24,
          kdj_k = EXCLUDED.kdj_k,
          kdj_d = EXCLUDED.kdj_d,
          kdj_j = EXCLUDED.kdj_j,
          boll_upper = EXCLUDED.boll_upper,
          boll_mid = EXCLUDED.boll_mid,
          boll_lower = EXCLUDED.boll_lower
      `;

      for (const data of marketData) {
        await client.query(insertQuery, [
          data.stockCode,
          data.stockName || null,
          data.tradeDate,
          data.openPrice,
          data.closePrice,
          data.highPrice,
          data.lowPrice,
          data.volume,
          data.amount,
          data.ma5,
          data.ma10,
          data.ma20,
          data.ma60,
          data.macd,
          data.macdSignal,
          data.macdHist,
          data.rsi6,
          data.rsi12,
          data.rsi24,
          data.kdjK,
          data.kdjD,
          data.kdjJ,
          data.bollUpper,
          data.bollMid,
          data.bollLower
        ]);
      }

      await client.query('COMMIT');
      console.log(`✅ 保存 ${marketData.length} 条行情数据到数据库`);

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('保存数据失败:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 从数据库获取行情数据
   * @param {string} stockCode - 股票代码
   * @param {number} limit - 限制条数
   */
  async getFromDatabase(stockCode, limit = 200) {
    const query = `
      SELECT * FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, limit]);
      return result.rows;
    } catch (error) {
      console.error('从数据库获取数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 更新股票行情数据（从API获取并保存）
   * @param {string} stockCode - 股票代码
   */
  async updateStockData(stockCode) {
    try {
      console.log(`🔄 开始更新股票数据: ${stockCode}`);

      // 1. 获取K线数据
      const endDate = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const startDate = new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10).replace(/-/g, '');

      const klines = await this.getDailyK(stockCode, startDate, endDate);

      if (!klines || klines.length === 0) {
        console.warn(`⚠️  未获取到数据: ${stockCode}`);
        return;
      }

      console.log(`📊 获取到 ${klines.length} 条K线数据`);

      // 2. 计算技术指标
      const marketData = await this.calculateIndicators(klines);

      // 3. 保存到数据库
      await this.saveToDatabase(marketData);

      console.log(`✅ 股票数据更新完成: ${stockCode}`);

      return marketData;

    } catch (error) {
      console.error(`❌ 更新股票数据失败: ${stockCode}`, error.message);
      throw error;
    }
  }

  /**
   * 批量更新多只股票数据
   * @param {Array} stockCodes - 股票代码数组
   */
  async batchUpdateStockData(stockCodes) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const data = await this.updateStockData(stockCode);
        results.push({ stockCode, success: true, count: data?.length || 0 });

        // 延迟，避免API限流
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.push({ stockCode, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * 获取实时数据（模拟）
   * @param {string} stockCode - 股票代码
   */
  async getRealtimeData(stockCode) {
    try {
      // 从数据库获取最新数据
      const data = await this.getFromDatabase(stockCode, 1);

      if (data.length > 0) {
        return {
          stockCode: data[0].stock_code,
          stockName: data[0].stock_name,
          price: data[0].closePrice,
          change: 0, // 需要计算涨跌幅
          changePercent: 0,
          volume: data[0].volume,
          time: data[0].trade_date
        };
      }

      return null;

    } catch (error) {
      console.error('获取实时数据失败:', error.message);
      throw error;
    }
  }
}

module.exports = EnhancedMarketService;
