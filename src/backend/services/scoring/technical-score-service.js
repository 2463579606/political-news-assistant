/**
 * Technical Score Service
 * 技术面评分服务
 *
 * 功能：
 * 1. 计算趋势指标评分 (MA)
 * 2. 计算动量指标评分 (MACD)
 * 3. 计算超买超卖评分 (RSI, KDJ)
 * 4. 计算波动性评分 (BOLL)
 * 5. 综合技术面评分
 */

const EnhancedMarketService = require('../market-data/enhanced-market-service');
const { Pool } = require('pg');

class TechnicalScoreService {
  constructor() {
    this.marketService = new EnhancedMarketService();
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 计算技术面综合评分
   * @param {string} stockCode - 股票代码
   */
  async calculateTechnicalScore(stockCode) {
    try {
      console.log(`📊 计算技术面评分: ${stockCode}`);

      // 1. 获取最新市场数据和技术指标
      const marketData = await this.getLatestMarketData(stockCode);

      if (!marketData) {
        throw new Error('无法获取市场数据');
      }

      // 2. 计算各维度评分
      const trendScore = this.calculateTrendScore(marketData);
      const momentumScore = this.calculateMomentumScore(marketData);
      const overboughtScore = this.calculateOverboughtScore(marketData);
      const volatilityScore = this.calculateVolatilityScore(marketData);

      // 3. 加权计算综合评分
      const overallScore = (
        trendScore * 0.40 +
        momentumScore * 0.30 +
        overboughtScore * 0.15 +
        volatilityScore * 0.15
      );

      const result = {
        stockCode: stockCode,
        scoreDate: new Date().toISOString().split('T')[0],
        scores: {
          trend: trendScore,
          momentum: momentumScore,
          overbought: overboughtScore,
          volatility: volatilityScore,
          overall: parseFloat(overallScore.toFixed(2))
        },
        grade: this.getGrade(overallScore),
        details: {
          ma: this.getMADetails(marketData),
          macd: this.getMACDDetails(marketData),
          rsi: this.getRSIDetails(marketData),
          kdj: this.getKDJDetails(marketData),
          boll: this.getBOLLDetails(marketData)
        }
      };

      console.log(`✅ 技术面评分: ${result.scores.overall} (${result.grade})`);

      return result;

    } catch (error) {
      console.error('计算技术面评分失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取最新市场数据
   */
  async getLatestMarketData(stockCode) {
    const query = `
      SELECT * FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date DESC
      LIMIT 60
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);

      if (result.rows.length === 0) {
        return null;
      }

      // 返回最新一天的数据（包含所有技术指标）
      return result.rows[0];

    } catch (error) {
      console.error('获取市场数据失败:', error.message);
      return null;
    }
  }

  /**
   * 计算趋势指标评分 (40%)
   * 基于MA多头/空头排列和价格相对位置
   */
  calculateTrendScore(data) {
    let score = 50; // 基准分

    // MA多头排列: MA5 > MA10 > MA20
    if (data.ma5 && data.ma10 && data.ma20) {
      const isBullish = data.ma5 > data.ma10 && data.ma10 > data.ma20;
      const isBearish = data.ma5 < data.ma10 && data.ma10 < data.ma20;

      if (isBullish) {
        score += 20; // 多头排列
      } else if (isBearish) {
        score -= 20; // 空头排列
      }

      // 价格相对MA的位置
      const price = data.close_price;
      const ma5 = data.ma5;

      if (price > ma5) {
        score += 10; // 价格在MA5之上
      } else if (price < ma5) {
        score -= 10; // 价格在MA5之下
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算动量指标评分 (30%)
   * 基于MACD金叉/死叉
   */
  calculateMomentumScore(data) {
    let score = 50; // 基准分

    if (data.macd_hist && data.macd && data.macd_signal) {
      // MACD金叉: DIF上穿DEA
      // MACD死叉: DIF下穿DEA
      const dif = parseFloat(data.macd);
      const dea = parseFloat(data.macd_signal);
      const macd = parseFloat(data.macd_hist);

      if (dif > dea) {
        score += 10; // DIF在DEA之上
      } else {
        score -= 10; // DIF在DEA之下
      }

      if (macd > 0) {
        score += 5; // 柱状图为正
      } else {
        score -= 5; // 柱状图为负
      }

      // 金叉/死叉判断需要前一日数据，这里简化处理
      // 实际应比较前后两日的DIF和DEA关系
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算超买超卖评分 (15%)
   * 基于RSI和KDJ
   */
  calculateOverboughtScore(data) {
    let score = 50; // 基准分

    // RSI评分
    if (data.rsi6) {
      const rsi = parseFloat(data.rsi6);

      if (rsi < 30) {
        score += 10; // 超卖，买入机会
      } else if (rsi > 70) {
        score -= 10; // 超买，卖出信号
      } else if (rsi < 40) {
        score += 5; // 偏弱
      } else if (rsi > 60) {
        score -= 5; // 偏强
      }
    }

    // KDJ评分
    if (data.kdj_k && data.kdj_d && data.kdj_j) {
      const k = parseFloat(data.kdj_k);
      const d = parseFloat(data.kdj_d);
      const j = parseFloat(data.kdj_j);

      if (k < 20 && d < 20) {
        score += 5; // KDJ超卖
      } else if (k > 80 && d > 80) {
        score -= 5; // KDJ超买
      }

      if (k > d) {
        score += 2; // K在D之上，买入信号
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算波动性评分 (15%)
   * 基于BOLL带宽和价格位置
   */
  calculateVolatilityScore(data) {
    let score = 50; // 基准分

    if (data.boll_upper && data.boll_mid && data.boll_lower) {
      const price = parseFloat(data.close_price);
      const upper = parseFloat(data.boll_upper);
      const lower = parseFloat(data.boll_lower);
      const middle = parseFloat(data.boll_mid);

      // BOLL带宽 (波动性)
      const bandwidth = ((upper - lower) / middle) * 100;

      // 价格相对BOLL的位置
      const position = (price - lower) / (upper - lower);

      if (price > upper) {
        score -= 10; // 突破上轨，可能回调
      } else if (price < lower) {
        score += 10; // 跌破下轨，可能反弹
      } else if (position > 0.8) {
        score -= 5; // 接近上轨
      } else if (position < 0.2) {
        score += 5; // 接近下轨
      }

      // 波动性评分（适中为好）
      if (bandwidth < 2) {
        score += 5; // 低波动，较稳定
      } else if (bandwidth > 10) {
        score -= 5; // 高波动，风险大
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 获取评分等级
   */
  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }

  /**
   * 获取MA详情
   */
  getMADetails(data) {
    return {
      ma5: data.ma5 ? parseFloat(data.ma5).toFixed(2) : null,
      ma10: data.ma10 ? parseFloat(data.ma10).toFixed(2) : null,
      ma20: data.ma20 ? parseFloat(data.ma20).toFixed(2) : null,
      trend: this.getMATrend(data)
    };
  }

  getMATrend(data) {
    if (!data.ma5 || !data.ma10 || !data.ma20) return 'UNKNOWN';

    if (data.ma5 > data.ma10 && data.ma10 > data.ma20) {
      return 'BULLISH'; // 多头
    } else if (data.ma5 < data.ma10 && data.ma10 < data.ma20) {
      return 'BEARISH'; // 空头
    } else {
      return 'MIXED'; // 震荡
    }
  }

  /**
   * 获取MACD详情
   */
  getMACDDetails(data) {
    return {
      macd: data.macd_hist ? parseFloat(data.macd_hist).toFixed(4) : null,
      dif: data.macd ? parseFloat(data.macd).toFixed(4) : null,
      dea: data.macd_signal ? parseFloat(data.macd_signal).toFixed(4) : null,
      signal: this.getMACDSignal(data)
    };
  }

  getMACDSignal(data) {
    if (!data.macd || !data.macd_signal) return 'UNKNOWN';

    if (data.macd > data.macd_signal && data.macd_hist > 0) {
      return 'GOLDEN_CROSS'; // 金叉
    } else if (data.macd < data.macd_signal && data.macd_hist < 0) {
      return 'DEATH_CROSS'; // 死叉
    } else if (data.macd > data.macd_signal) {
      return 'BULLISH'; // 多头
    } else {
      return 'BEARISH'; // 空头
    }
  }

  /**
   * 获取RSI详情
   */
  getRSIDetails(data) {
    const rsi = data.rsi6 ? parseFloat(data.rsi6) : null;

    return {
      rsi6: rsi ? rsi.toFixed(2) : null,
      status: this.getRSIStatus(rsi)
    };
  }

  getRSIStatus(rsi) {
    if (!rsi) return 'UNKNOWN';
    if (rsi < 30) return 'OVERSOLD'; // 超卖
    if (rsi > 70) return 'OVERBOUGHT'; // 超买
    if (rsi < 40) return 'WEAK'; // 偏弱
    if (rsi > 60) return 'STRONG'; // 偏强
    return 'NEUTRAL'; // 中性
  }

  /**
   * 获取KDJ详情
   */
  getKDJDetails(data) {
    return {
      k: data.kdj_k ? parseFloat(data.kdj_k).toFixed(2) : null,
      d: data.kdj_d ? parseFloat(data.kdj_d).toFixed(2) : null,
      j: data.kdj_j ? parseFloat(data.kdj_j).toFixed(2) : null,
      signal: this.getKDJSignal(data)
    };
  }

  getKDJSignal(data) {
    if (!data.kdj_k || !data.kdj_d) return 'UNKNOWN';

    const k = parseFloat(data.kdj_k);
    const d = parseFloat(data.kdj_d);

    if (k < 20 && d < 20) return 'OVERSOLD';
    if (k > 80 && d > 80) return 'OVERBOUGHT';
    if (k > d) return 'BUY';
    return 'SELL';
  }

  /**
   * 获取BOLL详情
   */
  getBOLLDetails(data) {
    if (!data.boll_upper || !data.boll_mid || !data.boll_lower) {
      return null;
    }

    const price = parseFloat(data.close_price);
    const upper = parseFloat(data.boll_upper);
    const middle = parseFloat(data.boll_mid);
    const lower = parseFloat(data.boll_lower);

    const position = ((price - lower) / (upper - lower) * 100).toFixed(2);
    const bandwidth = ((upper - lower) / middle * 100).toFixed(2);

    return {
      upper: upper.toFixed(2),
      middle: middle.toFixed(2),
      lower: lower.toFixed(2),
      position: parseFloat(position),
      bandwidth: parseFloat(bandwidth),
      signal: this.getBOLLSignal(parseFloat(position))
    };
  }

  getBOLLSignal(position) {
    if (position > 100) return 'BREAKOUT_UPPER'; // 突破上轨
    if (position < 0) return 'BREAKOUT_LOWER'; // 跌破下轨
    if (position > 80) return 'NEAR_UPPER'; // 接近上轨
    if (position < 20) return 'NEAR_LOWER'; // 接近下轨
    return 'MIDDLE'; // 中轨附近
  }

  /**
   * 批量计算技术面评分
   */
  async batchCalculateTechnicalScores(stockCodes) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const score = await this.calculateTechnicalScore(stockCode);
        results.push({
          success: true,
          stockCode: stockCode,
          data: score
        });

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        results.push({
          success: false,
          stockCode: stockCode,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取评分历史
   */
  async getScoreHistory(stockCode, days = 30) {
    // TODO: 实现评分历史查询
    // 需要先建立评分历史表
    return {
      stockCode: stockCode,
      history: []
    };
  }
}

module.exports = TechnicalScoreService;
