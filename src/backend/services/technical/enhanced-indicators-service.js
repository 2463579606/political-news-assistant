/**
 * Enhanced Technical Indicators Service
 * 增强技术指标服务
 *
 * 新增指标:
 * 1. 布林带 (BOLL)
 * 2. 随机指标 (KDJ)
 * 3. 威廉指标 (WR)
 * 4. 乖离率 (BIAS)
 * 5. 动向指标 (DMI)
 */

const { Pool } = require('pg');

class EnhancedTechnicalIndicatorsService {
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
   * 获取所有增强技术指标
   */
  async getEnhancedIndicators(stockCode, days = 60) {
    try {
      // 获取基础价格数据
      const marketData = await this.getMarketData(stockCode, days + 50);

      if (!marketData || marketData.length < 50) {
        return this.getDefaultIndicators();
      }

      // 计算各种指标
      const boll = this.calculateBOLL(marketData, days);
      const kdj = this.calculateKDJ(marketData, days);
      const wr = this.calculateWR(marketData, days);
      const bias = this.calculateBIAS(marketData, days);
      const dmi = this.calculateDMI(marketData, days);

      return {
        success: true,
        stockCode: stockCode,
        indicators: {
          boll: boll,
          kdj: kdj,
          wr: wr,
          bias: bias,
          dmi: dmi
        }
      };
    } catch (error) {
      console.error('获取增强技术指标失败:', error.message);
      return this.getDefaultIndicators();
    }
  }

  /**
   * 获取市场数据
   */
  async getMarketData(stockCode, days) {
    const query = `
      SELECT
        trade_date,
        open_price,
        close_price,
        high_price,
        low_price,
        volume
      FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date ASC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [stockCode, days]);
    return result.rows;
  }

  /**
   * 计算布林带 (BOLL)
   * @param period 周期，默认20
   * @param stdDev 标准差倍数，默认2
   */
  calculateBOLL(data, returnDays = 60, period = 20, stdDev = 2) {
    const closes = data.map(d => parseFloat(d.close_price));
    const bollData = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = closes.slice(i - period + 1, i + 1);

      // 计算中轨 (MA20)
      const mid = slice.reduce((sum, val) => sum + val, 0) / period;

      // 计算标准差
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - mid, 2), 0) / period;
      const std = Math.sqrt(variance);

      // 上轨和下轨
      const upper = mid + stdDev * std;
      const lower = mid - stdDev * std;

      bollData.push({
        date: data[i].trade_date,
        mid: mid.toFixed(2),
        upper: upper.toFixed(2),
        lower: lower.toFixed(2),
        width: ((upper - lower) / mid * 100).toFixed(2) // 带宽百分比
      });
    }

    return bollData.slice(-returnDays);
  }

  /**
   * 计算KDJ指标
   * @param n 周期，默认9
   * @param m1 M1周期，默认3
   * @param m2 M2周期，默认3
   */
  calculateKDJ(data, returnDays = 60, n = 9, m1 = 3, m2 = 3) {
    const kdjData = [];

    for (let i = n - 1; i < data.length; i++) {
      const slice = data.slice(i - n + 1, i + 1);

      const highs = slice.map(d => parseFloat(d.high_price));
      const lows = slice.map(d => parseFloat(d.low_price));
      const closes = slice.map(d => parseFloat(d.close_price));

      const high_n = Math.max(...highs);
      const low_n = Math.min(...lows);
      const close = closes[closes.length - 1];

      // RSV
      const rsv = (high_n - low_n) === 0 ? 50 : ((close - low_n) / (high_n - low_n)) * 100;

      // K值 (初始50)
      if (kdjData.length === 0) {
        const k = 50;
        const d = 50;
        const j = 3 * k - 2 * d;
        kdjData.push({
          date: data[i].trade_date,
          k: k.toFixed(2),
          d: d.toFixed(2),
          j: j.toFixed(2)
        });
      } else {
        const prevK = parseFloat(kdjData[kdjData.length - 1].k);
        const prevD = parseFloat(kdjData[kdjData.length - 1].d);

        const k = (2 / 3) * prevK + (1 / 3) * rsv;
        const d = (2 / 3) * prevD + (1 / 3) * k;
        const j = 3 * k - 2 * d;

        kdjData.push({
          date: data[i].trade_date,
          k: k.toFixed(2),
          d: d.toFixed(2),
          j: j.toFixed(2)
        });
      }
    }

    return kdjData.slice(-returnDays);
  }

  /**
   * 计算威廉指标 (WR)
   * @param period 周期，默认14
   */
  calculateWR(data, returnDays = 60, period = 14) {
    const wrData = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);

      const high_period = Math.max(...slice.map(d => parseFloat(d.high_price)));
      const low_period = Math.min(...slice.map(d => parseFloat(d.low_price)));
      const close = parseFloat(data[i].close_price);

      // WR值
      const wr = (high_period - low_period) === 0
        ? 0
        : ((high_period - close) / (high_period - low_period)) * -100;

      wrData.push({
        date: data[i].trade_date,
        wr: wr.toFixed(2)
      });
    }

    return wrData.slice(-returnDays);
  }

  /**
   * 计算乖离率 (BIAS)
   * @param period 周期，默认6
   */
  calculateBIAS(data, returnDays = 60, period = 6) {
    const biasData = [];

    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const ma = slice.reduce((sum, d) => sum + parseFloat(d.close_price), 0) / period;
      const close = parseFloat(data[i].close_price);

      // BIAS = (收盘价 - MA) / MA * 100%
      const bias = ((close - ma) / ma) * 100;

      biasData.push({
        date: data[i].trade_date,
        bias: bias.toFixed(2)
      });
    }

    return biasData.slice(-returnDays);
  }

  /**
   * 计算趋向指标 (DMI)
   * @param period 周期，默认14
   */
  calculateDMI(data, returnDays = 60, period = 14) {
    const dmiData = [];

    for (let i = 1; i < data.length; i++) {
      const curr = data[i];
      const prev = data[i - 1];

      const high = parseFloat(curr.high_price);
      const low = parseFloat(curr.low_price);
      const prevHigh = parseFloat(prev.high_price);
      const prevLow = parseFloat(prev.low_price);
      const prevClose = parseFloat(prev.close_price);

      // +DM, -DM
      const upMove = high - prevHigh;
      const downMove = prevLow - low;

      let plusDM = 0;
      let minusDM = 0;

      if (upMove > downMove && upMove > 0) {
        plusDM = upMove;
      }
      if (downMove > upMove && downMove > 0) {
        minusDM = downMove;
      }

      // TR
      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      if (i >= period) {
        // 计算平滑的+DM, -DM, TR
        let sumPlusDM = 0;
        let sumMinusDM = 0;
        let sumTR = 0;

        for (let j = i - period + 1; j <= i; j++) {
          const curr_j = data[j];
          const prev_j = j > 0 ? data[j - 1] : data[j];

          const high_j = parseFloat(curr_j.high_price);
          const low_j = parseFloat(curr_j.low_price);
          const prevHigh_j = parseFloat(prev_j.high_price);
          const prevLow_j = parseFloat(prev_j.low_price);
          const prevClose_j = parseFloat(prev_j.close_price);

          const upMove_j = high_j - prevHigh_j;
          const downMove_j = prevLow_j - low_j;

          if (upMove_j > downMove_j && upMove_j > 0) {
            sumPlusDM += upMove_j;
          }
          if (downMove_j > upMove_j && downMove_j > 0) {
            sumMinusDM += downMove_j;
          }

          const tr_j = Math.max(
            high_j - low_j,
            Math.abs(high_j - prevClose_j),
            Math.abs(low_j - prevClose_j)
          );
          sumTR += tr_j;
        }

        // +DI, -DI
        const plusDI = sumTR === 0 ? 0 : (sumPlusDM / sumTR) * 100;
        const minusDI = sumTR === 0 ? 0 : (sumMinusDM / sumTR) * 100;

        // DX
        const diDiff = Math.abs(plusDI - minusDI);
        const diSum = plusDI + minusDI;
        const dx = diSum === 0 ? 0 : (diDiff / diSum) * 100;

        dmiData.push({
          date: curr.trade_date,
          plusDI: plusDI.toFixed(2),
          minusDI: minusDI.toFixed(2),
          dx: dx.toFixed(2),
          adx: i >= period * 2 ? this.calculateADX(dmiData, period).toFixed(2) : '0.00'
        });
      }
    }

    return dmiData.slice(-returnDays);
  }

  /**
   * 计算ADX (Average Directional Index)
   */
  calculateADX(dmiData, period) {
    const recent = dmiData.slice(-period);
    const avgDX = recent.reduce((sum, d) => sum + parseFloat(d.dx), 0) / period;
    return avgDX;
  }

  /**
   * 获取默认指标
   */
  getDefaultIndicators() {
    return {
      success: false,
      indicators: {
        boll: [],
        kdj: [],
        wr: [],
        bias: [],
        dmi: []
      }
    };
  }

  /**
   * 生成技术信号分析
   */
  analyzeIndicators(indicators) {
    const signals = [];

    // 布林带信号
    if (indicators.boll && indicators.boll.length > 0) {
      const latest = indicators.boll[indicators.boll.length - 1];
      const width = parseFloat(latest.width);

      if (width < 5) {
        signals.push({
          type: 'BOLL',
          signal: '收口',
          meaning: '布林带收口，可能面临方向选择',
          bullish: false,
          bearish: false
        });
      } else if (width > 20) {
        signals.push({
          type: 'BOLL',
          signal: '开口',
          meaning: '布林带开口，波动加剧',
          bullish: false,
          bearish: false
        });
      }
    }

    // KDJ信号
    if (indicators.kdj && indicators.kdj.length > 0) {
      const latest = indicators.kdj[indicators.kdj.length - 1];
      const k = parseFloat(latest.k);
      const d = parseFloat(latest.d);
      const j = parseFloat(latest.j);

      if (k < 20 && d < 20) {
        signals.push({
          type: 'KDJ',
          signal: '超卖',
          meaning: 'KDJ低位超卖，可能反弹',
          bullish: true,
          bearish: false
        });
      } else if (k > 80 && d > 80) {
        signals.push({
          type: 'KDJ',
          signal: '超买',
          meaning: 'KDJ高位超买，注意风险',
          bullish: false,
          bearish: true
        });
      } else if (k > d && j > d) {
        signals.push({
          type: 'KDJ',
          signal: '金叉',
          meaning: 'KDJ金叉，看涨信号',
          bullish: true,
          bearish: false
        });
      } else if (k < d && j < d) {
        signals.push({
          type: 'KDJ',
          signal: '死叉',
          meaning: 'KDJ死叉，看跌信号',
          bullish: false,
          bearish: true
        });
      }
    }

    // WR信号
    if (indicators.wr && indicators.wr.length > 0) {
      const latest = indicators.wr[indicators.wr.length - 1];
      const wr = parseFloat(latest.wr);

      if (wr < -80) {
        signals.push({
          type: 'WR',
          signal: '超卖',
          meaning: 'WR严重超卖，可能反弹',
          bullish: true,
          bearish: false
        });
      } else if (wr > -20) {
        signals.push({
          type: 'WR',
          signal: '超买',
          meaning: 'WR严重超买，注意风险',
          bullish: false,
          bearish: true
        });
      }
    }

    // BIAS信号
    if (indicators.bias && indicators.bias.length > 0) {
      const latest = indicators.bias[indicators.bias.length - 1];
      const bias = parseFloat(latest.bias);

      if (bias < -5) {
        signals.push({
          type: 'BIAS',
          signal: '超跌',
          meaning: '乖离率过低，超跌反弹',
          bullish: true,
          bearish: false
        });
      } else if (bias > 5) {
        signals.push({
          type: 'BIAS',
          signal: '超涨',
          meaning: '乖离率过高，注意回调',
          bullish: false,
          bearish: true
        });
      }
    }

    // DMI信号
    if (indicators.dmi && indicators.dmi.length > 0) {
      const latest = indicators.dmi[indicators.dmi.length - 1];
      const plusDI = parseFloat(latest.plusDI);
      const minusDI = parseFloat(latest.minusDI);
      const adx = parseFloat(latest.adx);

      if (plusDI > minusDI && adx > 25) {
        signals.push({
          type: 'DMI',
          signal: '上升趋势',
          meaning: '+DI上穿-DI，上升趋势明确',
          bullish: true,
          bearish: false
        });
      } else if (minusDI > plusDI && adx > 25) {
        signals.push({
          type: 'DMI',
          signal: '下降趋势',
          meaning: '-DI上穿+DI，下降趋势明确',
          bullish: false,
          bearish: true
        });
      }

      if (adx > 40) {
        signals.push({
          type: 'ADX',
          signal: '强势趋势',
          meaning: 'ADX>40，趋势强劲',
          bullish: false,
          bearish: false
        });
      } else if (adx < 20) {
        signals.push({
          type: 'ADX',
          signal: '无趋势',
          meaning: 'ADX<20，震荡市',
          bullish: false,
          bearish: false
        });
      }
    }

    return signals;
  }
}

module.exports = EnhancedTechnicalIndicatorsService;
