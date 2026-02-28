/**
 * 价格数据服务
 * 用于获取K线图和技术指标图所需的数据
 */

const { Pool } = require('pg');

class PriceDataService {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 获取K线数据
   */
  async getKlineData(stockCode, days = 60) {
    // 额外查询20天数据用于计算MA
    const queryDays = days + 20;

    const query = `
      SELECT
        trade_date,
        open_price as open,
        close_price as close,
        high_price as high,
        low_price as low,
        volume,
        amount
      FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, queryDays]);
      const data = result.rows.reverse();

      // 计算MA5, MA10, MA20, MA60
      const enriched = this.calculateMA(data);

      // 只返回最近days天的数据（这样MA20也能完整显示）
      return enriched.slice(-days);
    } catch (error) {
      console.error('获取K线数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 计算移动平均线
   */
  calculateMA(data) {
    const closes = data.map(d => parseFloat(d.close));

    for (let i = 0; i < data.length; i++) {
      // MA5
      if (i >= 4) {
        data[i].ma5 = closes.slice(i - 4, i + 1).reduce((a, b) => a + b, 0) / 5;
      }

      // MA10
      if (i >= 9) {
        data[i].ma10 = closes.slice(i - 9, i + 1).reduce((a, b) => a + b, 0) / 10;
      }

      // MA20
      if (i >= 19) {
        data[i].ma20 = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
      }

      // MA60
      if (i >= 59) {
        data[i].ma60 = closes.slice(i - 59, i + 1).reduce((a, b) => a + b, 0) / 60;
      }
    }

    return data;
  }

  /**
   * 获取RSI数据
   */
  async getRSIData(stockCode, days = 60, period = 14) {
    const query = `
      SELECT
        trade_date,
        close_price as close
      FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date ASC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, days + period]);
      const data = result.rows;

      // 计算RSI
      const rsiData = this.calculateRSI(data, period);

      return rsiData.slice(-days); // 只返回最近days天
    } catch (error) {
      console.error('获取RSI数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 计算RSI
   */
  calculateRSI(data, period = 14) {
    const rsiData = [];

    for (let i = 0; i < data.length; i++) {
      if (i < period) {
        rsiData.push({
          date: data[i].trade_date,
          value: null
        });
        continue;
      }

      let gains = 0;
      let losses = 0;

      for (let j = i - period + 1; j <= i; j++) {
        const change = parseFloat(data[j].close) - parseFloat(data[j - 1].close);
        if (change > 0) {
          gains += change;
        } else {
          losses -= change;
        }
      }

      const avgGain = gains / period;
      const avgLoss = losses / period;

      let rsi;
      if (avgLoss === 0) {
        rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi = 100 - (100 / (1 + rs));
      }

      rsiData.push({
        date: data[i].trade_date,
        value: parseFloat(rsi.toFixed(2))
      });
    }

    return rsiData;
  }

  /**
   * 获取MACD数据
   */
  async getMACDData(stockCode, days = 60) {
    const query = `
      SELECT
        trade_date,
        close_price as close
      FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date ASC
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);
      const data = result.rows;

      // 计算MACD (12, 26, 9)
      const macdData = this.calculateMACD(data);

      return macdData.slice(-days);
    } catch (error) {
      console.error('获取MACD数据失败:', error.message);
      throw error;
    }
  }

  /**
   * 计算MACD
   */
  calculateMACD(data, shortPeriod = 12, longPeriod = 26, signalPeriod = 9) {
    const closes = data.map(d => parseFloat(d.close));

    // 计算EMA
    const emaShort = this.calculateEMAArray(closes, shortPeriod);
    const emaLong = this.calculateEMAArray(closes, longPeriod);

    // MACD Line = EMA(12) - EMA(26)
    const macdLine = [];
    for (let i = 0; i < data.length; i++) {
      macdLine.push(emaShort[i] - emaLong[i]);
    }

    // Signal Line = EMA(9) of MACD
    const signalLine = this.calculateEMAArray(macdLine, signalPeriod);

    // Histogram = MACD - Signal
    const histogram = [];
    for (let i = 0; i < data.length; i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }

    // 组合结果
    const result = [];
    for (let i = 0; i < data.length; i++) {
      result.push({
        date: data[i].trade_date,
        macd: parseFloat(macdLine[i].toFixed(4)),
        signal: parseFloat(signalLine[i].toFixed(4)),
        histogram: parseFloat(histogram[i].toFixed(4))
      });
    }

    return result;
  }

  /**
   * 计算EMA数组
   */
  calculateEMAArray(data, period) {
    const ema = [];
    const multiplier = 2 / (period + 1);

    // 第一个EMA值使用SMA
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += data[i];
      ema.push(sum / (i + 1)); // 使用简单的平均值
    }

    // 后续EMA值
    for (let i = period; i < data.length; i++) {
      const currentEMA = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
      ema.push(currentEMA);
    }

    return ema;
  }

  /**
   * 获取资金流向数据
   */
  async getFundFlowData(stockCode, days = 30) {
    const query = `
      SELECT
        trade_date,
        main_net,
        main_net_ratio,
        superlarge_net,
        large_net,
        medium_net,
        small_net
      FROM fund_flow
      WHERE stock_code = $1
      ORDER BY trade_date DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, days]);
      return result.rows.reverse();
    } catch (error) {
      console.error('获取资金流向数据失败:', error.message);
      return [];
    }
  }

  /**
   * 获取完整的技术指标数据（用于图表）
   */
  async getChartData(stockCode, days = 60) {
    try {
      const [klineData, rsiData, macdData, fundFlowData] = await Promise.all([
        this.getKlineData(stockCode, days),
        this.getRSIData(stockCode, days),
        this.getMACDData(stockCode, days),
        this.getFundFlowData(stockCode, days)
      ]);

      return {
        kline: klineData,
        rsi: rsiData,
        macd: macdData,
        fundFlow: fundFlowData
      };
    } catch (error) {
      console.error('获取图表数据失败:', error.message);
      throw error;
    }
  }
}

module.exports = PriceDataService;
