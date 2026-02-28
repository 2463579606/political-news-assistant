/**
 * Fundamental Analysis Service
 * 基本面分析服务
 *
 * 功能:
 * 1. 获取财务数据
 * 2. 计算财务指标
 * 3. 生成基本面评分
 * 4. 估值分析
 */

const { Pool } = require('pg');

class FundamentalAnalysisService {
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
   * 获取股票的完整基本面分析
   */
  async getFundamentalAnalysis(stockCode) {
    try {
      // 1. 获取财务数据
      const financialData = await this.getFinancialData(stockCode);

      if (!financialData) {
        return this.getDefaultAnalysis();
      }

      // 2. 计算关键财务指标
      const metrics = this.calculateFinancialMetrics(financialData);

      // 3. 基本面评分
      const scores = this.calculateFundamentalScores(metrics);

      // 4. 估值分析
      const valuation = this.analyzeValuation(metrics);

      // 5. 综合评级
      const rating = this.getOverallRating(scores, valuation);

      return {
        success: true,
        data: {
          stockCode: stockCode,
          financialData: financialData,
          metrics: metrics,
          scores: scores,
          valuation: valuation,
          rating: rating,
          summary: this.generateSummary(metrics, scores, rating)
        }
      };
    } catch (error) {
      console.error('基本面分析失败:', error.message);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * 获取财务数据（模拟真实数据）
   * 实际应用中应从API或数据库获取
   */
  async getFinancialData(stockCode) {
    // 模拟财务数据 - 实际应用中从API获取
    const mockData = {
      '000001.SZ': { // 平安银行
        revenue: 1583.98, // 营业收入(亿元)
        revenueGrowth: 0.085, // 营收增长率
        netProfit: 378.29, // 净利润(亿元)
        netProfitGrowth: 0.105, // 净利润增长率
        totalAssets: 49312.56, // 总资产(亿元)
        totalLiabilities: 45218.73, // 总负债(亿元)
        equity: 4093.83, // 股东权益(亿元)
        eps: 1.96, // 每股收益
        bps: 21.25, // 每股净资产
        roe: 0.0924, // 净资产收益率
        roa: 0.0077, // 总资产收益率
        grossMargin: 0.45, // 毛利率
        netMargin: 0.239, // 净利率
        debtRatio: 0.917, // 资产负债率
        currentRatio: 0.95, // 流动比率
        quickRatio: 0.92, // 速动比率
        operatingCashFlow: 285.6, // 经营现金流(亿元)
        freeCashFlow: 156.3, // 自由现金流(亿元)
        marketCap: 2185.5, // 市值(亿元)
        pe: 5.78, // 市盈率
        pb: 0.53, // 市净率
        dividendYield: 0.052 // 股息率
      },
      '600036.SH': { // 招商银行
        revenue: 3311.23,
        revenueGrowth: 0.072,
        netProfit: 1468.45,
        netProfitGrowth: 0.098,
        totalAssets: 105872.32,
        totalLiabilities: 98234.56,
        equity: 7637.76,
        eps: 5.84,
        bps: 30.42,
        roe: 0.1923,
        roa: 0.0139,
        grossMargin: 0.52,
        netMargin: 0.443,
        debtRatio: 0.928,
        currentRatio: 1.02,
        quickRatio: 0.98,
        operatingCashFlow: 1123.5,
        freeCashFlow: 756.8,
        marketCap: 8923.6,
        pe: 6.08,
        pb: 1.17,
        dividendYield: 0.048
      },
      '600519.SH': { // 贵州茅台
        revenue: 1374.01,
        revenueGrowth: 0.185,
        netProfit: 747.34,
        netProfitGrowth: 0.158,
        totalAssets: 2542.87,
        totalLiabilities: 523.45,
        equity: 2019.42,
        eps: 5.95,
        bps: 16.07,
        roe: 0.3700,
        roa: 0.2938,
        grossMargin: 0.914,
        netMargin: 0.544,
        debtRatio: 0.206,
        currentRatio: 3.45,
        quickRatio: 2.87,
        operatingCashFlow: 892.3,
        freeCashFlow: 723.5,
        marketCap: 23856.8,
        pe: 31.92,
        pb: 11.83,
        dividendYield: 0.018
      },
      '000002.SZ': { // 万科A
        revenue: 4657.34,
        revenueGrowth: -0.021,
        netProfit: 318.56,
        netProfitGrowth: -0.157,
        totalAssets: 15234.56,
        totalLiabilities: 10892.34,
        equity: 4342.22,
        eps: 2.73,
        bps: 37.25,
        roe: 0.0734,
        roa: 0.0209,
        grossMargin: 0.162,
        netMargin: 0.068,
        debtRatio: 0.715,
        currentRatio: 1.34,
        quickRatio: 0.42,
        operatingCashFlow: 234.5,
        freeCashFlow: 89.3,
        marketCap: 2456.7,
        pe: 7.71,
        pb: 0.57,
        dividendYield: 0.042
      }
    };

    return mockData[stockCode] || this.generateRandomFinancialData(stockCode);
  }

  /**
   * 为未知股票生成随机财务数据
   */
  generateRandomFinancialData(stockCode) {
    // 基于股票代码生成一致的随机数据
    const hash = stockCode.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const random = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    return {
      revenue: 500 + random(hash) * 2000,
      revenueGrowth: random(hash + 1) * 0.3 - 0.05,
      netProfit: 50 + random(hash + 2) * 500,
      netProfitGrowth: random(hash + 3) * 0.4 - 0.1,
      totalAssets: 1000 + random(hash + 4) * 10000,
      totalLiabilities: 500 + random(hash + 5) * 8000,
      equity: 500 + random(hash + 6) * 2000,
      eps: 0.5 + random(hash + 7) * 5,
      bps: 5 + random(hash + 8) * 25,
      roe: 0.05 + random(hash + 9) * 0.25,
      roa: 0.005 + random(hash + 10) * 0.04,
      grossMargin: 0.2 + random(hash + 11) * 0.4,
      netMargin: 0.05 + random(hash + 12) * 0.3,
      debtRatio: 0.3 + random(hash + 13) * 0.6,
      currentRatio: 0.5 + random(hash + 14) * 2,
      quickRatio: 0.3 + random(hash + 15) * 1.5,
      operatingCashFlow: 50 + random(hash + 16) * 500,
      freeCashFlow: 20 + random(hash + 17) * 300,
      marketCap: 200 + random(hash + 18) * 5000,
      pe: 5 + random(hash + 19) * 40,
      pb: 0.5 + random(hash + 20) * 5,
      dividendYield: random(hash + 21) * 0.08
    };
  }

  /**
   * 计算财务指标
   */
  calculateFinancialMetrics(data) {
    // ROE分解（杜邦分析法）
    const profitMargin = data.netMargin;
    const assetTurnover = data.revenue / data.totalAssets;
    const financialLeverage = data.totalAssets / data.equity;
    const roeDecomposition = {
      profitMargin: profitMargin,
      assetTurnover: assetTurnover,
      financialLeverage: financialLeverage
    };

    // 盈利能力指标
    const profitability = {
      roe: data.roe, // 净资产收益率
      roa: data.roa, // 总资产收益率
      grossMargin: data.grossMargin, // 毛利率
      netMargin: data.netMargin, // 净利率
      operatingMargin: data.netMargin * 1.2 // 营业利润率(估算)
    };

    // 成长能力指标
    const growth = {
      revenueGrowth: data.revenueGrowth, // 营收增长率
      profitGrowth: data.netProfitGrowth, // 利润增长率
      revenueGrowth3Y: data.revenueGrowth * 0.9, // 3年营收增长(估算)
      profitGrowth3Y: data.netProfitGrowth * 0.85 // 3年利润增长(估算)
    };

    // 财务健康指标
    const financialHealth = {
      debtRatio: data.debtRatio, // 资产负债率
      currentRatio: data.currentRatio, // 流动比率
      quickRatio: data.quickRatio, // 速动比率
      interestCoverage: data.netProfit * 3 / (data.totalLiabilities * 0.05), // 利息保障倍数
      cashRatio: data.operatingCashFlow / data.totalLiabilities // 现金比率
    };

    // 估值指标
    const valuation = {
      pe: data.pe, // 市盈率
      pb: data.pb, // 市净率
      ps: data.marketCap / data.revenue, // 市销率
      pfcf: data.marketCap / data.freeCashFlow, // 市现率
      ev: data.marketCap + data.totalLiabilities - data.operatingCashFlow, // 企业价值
      evEbitda: (data.marketCap + data.totalLiabilities) / (data.netProfit * 4) // EV/EBITDA
    };

    return {
      profitability,
      growth,
      financialHealth,
      valuation,
      roeDecomposition
    };
  }

  /**
   * 计算基本面评分
   */
  calculateFundamentalScores(metrics) {
    const scores = {
      profitability: this.scoreProfitability(metrics.profitability),
      growth: this.scoreGrowth(metrics.growth),
      financialHealth: this.scoreFinancialHealth(metrics.financialHealth),
      valuation: this.scoreValuation(metrics.valuation),
      quality: this.scoreQuality(metrics)
    };

    // 加权总分
    scores.total = (
      scores.profitability * 0.3 +
      scores.growth * 0.2 +
      scores.financialHealth * 0.25 +
      scores.valuation * 0.15 +
      scores.quality * 0.1
    );

    // 评级
    if (scores.total >= 85) {
      scores.grade = 'A';
      scores.gradeText = '优秀';
    } else if (scores.total >= 75) {
      scores.grade = 'B';
      scores.gradeText = '良好';
    } else if (scores.total >= 60) {
      scores.grade = 'C';
      scores.gradeText = '中等';
    } else if (scores.total >= 45) {
      scores.grade = 'D';
      scores.gradeText = '较差';
    } else {
      scores.grade = 'E';
      scores.gradeText = '差';
    }

    return scores;
  }

  /**
   * 盈利能力评分 (0-100)
   */
  scoreProfitability(profitability) {
    let score = 0;

    // ROE评分 (40分)
    if (profitability.roe >= 0.20) {
      score += 40;
    } else if (profitability.roe >= 0.15) {
      score += 35;
    } else if (profitability.roe >= 0.10) {
      score += 25;
    } else if (profitability.roe >= 0.05) {
      score += 15;
    } else {
      score += 5;
    }

    // 净利率评分 (30分)
    if (profitability.netMargin >= 0.30) {
      score += 30;
    } else if (profitability.netMargin >= 0.20) {
      score += 25;
    } else if (profitability.netMargin >= 0.10) {
      score += 15;
    } else if (profitability.netMargin >= 0.05) {
      score += 8;
    } else {
      score += 3;
    }

    // 毛利率评分 (30分)
    if (profitability.grossMargin >= 0.60) {
      score += 30;
    } else if (profitability.grossMargin >= 0.40) {
      score += 25;
    } else if (profitability.grossMargin >= 0.25) {
      score += 15;
    } else {
      score += 5;
    }

    return score;
  }

  /**
   * 成长能力评分 (0-100)
   */
  scoreGrowth(growth) {
    let score = 0;

    // 营收增长评分 (50分)
    if (growth.revenueGrowth >= 0.30) {
      score += 50;
    } else if (growth.revenueGrowth >= 0.20) {
      score += 45;
    } else if (growth.revenueGrowth >= 0.10) {
      score += 35;
    } else if (growth.revenueGrowth >= 0.05) {
      score += 20;
    } else if (growth.revenueGrowth >= 0) {
      score += 10;
    } else if (growth.revenueGrowth >= -0.10) {
      score += 5;
    } else {
      score += 0;
    }

    // 利润增长评分 (50分)
    if (growth.profitGrowth >= 0.30) {
      score += 50;
    } else if (growth.profitGrowth >= 0.20) {
      score += 45;
    } else if (growth.profitGrowth >= 0.10) {
      score += 35;
    } else if (growth.profitGrowth >= 0.05) {
      score += 20;
    } else if (growth.profitGrowth >= 0) {
      score += 10;
    } else if (growth.profitGrowth >= -0.10) {
      score += 5;
    } else {
      score += 0;
    }

    return Math.min(score, 100);
  }

  /**
   * 财务健康评分 (0-100)
   */
  scoreFinancialHealth(health) {
    let score = 0;

    // 资产负债率评分 (30分) - 越低越好
    if (health.debtRatio <= 0.3) {
      score += 30;
    } else if (health.debtRatio <= 0.5) {
      score += 25;
    } else if (health.debtRatio <= 0.7) {
      score += 15;
    } else if (health.debtRatio <= 0.85) {
      score += 5;
    } else {
      score += 0;
    }

    // 流动比率评分 (30分)
    if (health.currentRatio >= 2) {
      score += 30;
    } else if (health.currentRatio >= 1.5) {
      score += 25;
    } else if (health.currentRatio >= 1) {
      score += 15;
    } else if (health.currentRatio >= 0.8) {
      score += 8;
    } else {
      score += 0;
    }

    // 速动比率评分 (20分)
    if (health.quickRatio >= 1.5) {
      score += 20;
    } else if (health.quickRatio >= 1) {
      score += 15;
    } else if (health.quickRatio >= 0.8) {
      score += 10;
    } else if (health.quickRatio >= 0.5) {
      score += 5;
    } else {
      score += 0;
    }

    // 利息保障倍数 (20分)
    if (health.interestCoverage >= 5) {
      score += 20;
    } else if (health.interestCoverage >= 3) {
      score += 15;
    } else if (health.interestCoverage >= 1.5) {
      score += 10;
    } else if (health.interestCoverage >= 1) {
      score += 5;
    } else {
      score += 0;
    }

    return score;
  }

  /**
   * 估值评分 (0-100) - PE、PB越低越好
   */
  scoreValuation(valuation) {
    let score = 0;

    // PE评分 (50分)
    if (valuation.pe <= 10) {
      score += 50;
    } else if (valuation.pe <= 15) {
      score += 45;
    } else if (valuation.pe <= 20) {
      score += 35;
    } else if (valuation.pe <= 30) {
      score += 20;
    } else if (valuation.pe <= 50) {
      score += 10;
    } else {
      score += 0;
    }

    // PB评分 (50分)
    if (valuation.pb <= 1) {
      score += 50;
    } else if (valuation.pb <= 1.5) {
      score += 45;
    } else if (valuation.pb <= 2) {
      score += 35;
    } else if (valuation.pb <= 3) {
      score += 20;
    } else if (valuation.pb <= 5) {
      score += 10;
    } else {
      score += 0;
    }

    return score;
  }

  /**
   * 质量评分 (0-100) - 综合评分
   */
  scoreQuality(metrics) {
    let score = 0;

    // ROA评分 (30分)
    if (metrics.profitability.roa >= 0.15) {
      score += 30;
    } else if (metrics.profitability.roa >= 0.10) {
      score += 25;
    } else if (metrics.profitability.roa >= 0.05) {
      score += 15;
    } else {
      score += 5;
    }

    // 毛利率稳定性 (30分)
    if (metrics.profitability.grossMargin >= 0.50) {
      score += 30;
    } else if (metrics.profitability.grossMargin >= 0.30) {
      score += 20;
    } else {
      score += 10;
    }

    // 现金流质量 (40分)
    const operatingCashToRevenue = 0.2; // 假设值
    if (operatingCashToRevenue >= 0.3) {
      score += 40;
    } else if (operatingCashToRevenue >= 0.2) {
      score += 30;
    } else if (operatingCashToRevenue >= 0.1) {
      score += 15;
    } else {
      score += 5;
    }

    return score;
  }

  /**
   * 估值分析
   */
  analyzeValuation(metrics) {
    const pe = metrics.valuation.pe;
    const pb = metrics.valuation.pb;
    const ps = metrics.valuation.ps;

    // PE估值
    let peStatus;
    if (pe < 10) {
      peStatus = '低估';
    } else if (pe < 15) {
      peStatus = '合理偏低';
    } else if (pe < 25) {
      peStatus = '合理';
    } else if (pe < 40) {
      peStatus = '偏高';
    } else {
      peStatus = '高估';
    }

    // PB估值
    let pbStatus;
    if (pb < 1) {
      pbStatus = '低估';
    } else if (pb < 1.5) {
      pbStatus = '合理偏低';
    } else if (pb < 2.5) {
      pbStatus = '合理';
    } else if (pb < 4) {
      pbStatus = '偏高';
    } else {
      pbStatus = '高估';
    }

    // 综合估值
    let valuation;
    if (pe < 15 && pb < 1.5) {
      valuation = '低估';
    } else if (pe < 25 && pb < 2.5) {
      valuation = '合理';
    } else if (pe < 40 && pb < 4) {
      valuation = '偏高';
    } else {
      valuation = '高估';
    }

    return {
      pe: pe,
      peStatus: peStatus,
      pb: pb,
      pbStatus: pbStatus,
      ps: ps,
      overall: valuation
    };
  }

  /**
   * 综合评级
   */
  getOverallRating(scores, valuation) {
    const grade = scores.grade;
    const valuationLevel = valuation.overall;

    // 评级矩阵
    const ratingMatrix = {
      'A': {
        '低估': '强烈推荐',
        '合理': '推荐',
        '偏高': '持有',
        '高估': '持有'
      },
      'B': {
        '低估': '推荐',
        '合理': '推荐',
        '偏高': '持有',
        '高估': '谨慎'
      },
      'C': {
        '低估': '持有',
        '合理': '持有',
        '偏高': '谨慎',
        '高估': '避免'
      },
      'D': {
        '低估': '谨慎',
        '合理': '谨慎',
        '偏高': '避免',
        '高估': '避免'
      },
      'E': {
        '低估': '避免',
        '合理': '避免',
        '偏高': '强烈避免',
        '高估': '强烈避免'
      }
    };

    return ratingMatrix[grade][valuationLevel] || '中性';
  }

  /**
   * 生成分析摘要
   */
  generateSummary(metrics, scores, rating) {
    const profit = scores.profitability.toFixed(0);
    const growth = scores.growth.toFixed(0);
    const health = scores.financialHealth.toFixed(0);
    const value = scores.valuation.toFixed(0);
    const total = scores.total.toFixed(0);

    return `基本面评分${total}分(${scores.grade}级)。
盈利能力${profit}分，成长能力${growth}分，
财务健康${health}分，估值吸引力${value}分。
综合评级：${rating}。`;
  }

  /**
   * 获取默认分析（数据缺失时）
   */
  getDefaultAnalysis() {
    return {
      success: true,
      data: {
        stockCode: null,
        financialData: null,
        metrics: null,
        scores: {
          profitability: 50,
          growth: 50,
          financialHealth: 50,
          valuation: 50,
          quality: 50,
          total: 50,
          grade: 'C',
          gradeText: '中等'
        },
        valuation: {
          pe: null,
          peStatus: '未知',
          pb: null,
          pbStatus: '未知',
          overall: '未知'
        },
        rating: '数据不足',
        summary: '暂无财务数据，无法进行基本面分析。'
      }
    };
  }
}

module.exports = FundamentalAnalysisService;
