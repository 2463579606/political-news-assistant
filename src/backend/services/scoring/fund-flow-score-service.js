/**
 * Fund Flow Score Service
 * 资金面评分服务
 *
 * 功能：
 * 1. 计算主力流向评分
 * 2. 计算连续性评分
 * 3. 计算散户情绪评分
 * 4. 综合资金面评分
 */

const FundFlowService = require('../fund-flow/fund-flow-service');
const { Pool } = require('pg');

class FundFlowScoreService {
  constructor() {
    this.fundFlowService = new FundFlowService();
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 计算资金面综合评分
   * @param {string} stockCode - 股票代码
   */
  async calculateFundFlowScore(stockCode) {
    try {
      console.log(`💰 计算资金面评分: ${stockCode}`);

      // 1. 获取最新资金流向数据
      const fundFlowData = await this.getLatestFundFlowData(stockCode);

      if (!fundFlowData) {
        // 没有资金流向数据，返回中性评分
        return this.getNeutralScore(stockCode);
      }

      // 2. 计算各维度评分
      const mainFlowScore = this.calculateMainFlowScore(fundFlowData);
      const consecutiveScore = this.calculateConsecutiveScore(fundFlowData);
      const retailScore = this.calculateRetailScore(fundFlowData);

      // 3. 加权计算综合评分
      const overallScore = (
        mainFlowScore * 0.50 +
        consecutiveScore * 0.30 +
        retailScore * 0.20
      );

      const result = {
        stockCode: stockCode,
        scoreDate: new Date().toISOString().split('T')[0],
        scores: {
          mainFlow: mainFlowScore,
          consecutive: consecutiveScore,
          retail: retailScore,
          overall: parseFloat(overallScore.toFixed(2))
        },
        grade: this.getGrade(overallScore),
        details: {
          mainNetInflow: fundFlowData.main_net ?
            parseFloat(fundFlowData.main_net).toFixed(2) : 0,
          superLargeNetInflow: fundFlowData.superlarge_net ?
            parseFloat(fundFlowData.superlarge_net).toFixed(2) : 0,
          largeNetInflow: fundFlowData.large_net ?
            parseFloat(fundFlowData.large_net).toFixed(2) : 0,
          mediumNetInflow: fundFlowData.medium_net ?
            parseFloat(fundFlowData.medium_net).toFixed(2) : 0,
          smallNetInflow: fundFlowData.small_net ?
            parseFloat(fundFlowData.small_net).toFixed(2) : 0,
          consecutiveDays: fundFlowData.main_inflow_count || 0,
          trend: fundFlowData.trend || 'UNKNOWN'
        }
      };

      console.log(`✅ 资金面评分: ${result.scores.overall} (${result.grade})`);

      return result;

    } catch (error) {
      console.error('计算资金面评分失败:', error.message);
      return this.getNeutralScore(stockCode);
    }
  }

  /**
   * 获取最新资金流向数据
   */
  async getLatestFundFlowData(stockCode) {
    const query = `
      SELECT * FROM fund_flow
      WHERE stock_code = $1
      ORDER BY trade_date DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('获取资金流向数据失败:', error.message);
      return null;
    }
  }

  /**
   * 计算主力流向评分 (50%)
   */
  calculateMainFlowScore(data) {
    let score = 50; // 基准分

    if (data.main_net !== null && data.main_net !== undefined) {
      const mainFlow = parseFloat(data.main_net);

      // 大幅流入 (>1亿)
      if (mainFlow > 100000000) {
        score = 100;
      }
      // 流入 (>0)
      else if (mainFlow > 0) {
        score = 50 + Math.min(50, (mainFlow / 100000000) * 50);
      }
      // 流出 (<0)
      else if (mainFlow < 0) {
        score = 50 + Math.max(-50, (mainFlow / 100000000) * 50);
      }
      // 大幅流出 (<-1亿)
      else if (mainFlow < -100000000) {
        score = 0;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算连续性评分 (30%)
   */
  calculateConsecutiveScore(data) {
    let score = 50; // 基准分

    if (data.main_inflow_count !== null && data.main_inflow_count !== undefined) {
      const days = parseInt(data.main_inflow_count);

      if (days >= 5) {
        score = 100; // 连续5天以上流入
      } else if (days >= 3) {
        score = 85; // 连续3-4天流入
      } else if (days >= 1) {
        score = 70; // 连续1-2天流入
      } else if (days === 0) {
        score = 50; // 无连续模式
      } else if (days <= -3) {
        score = 15; // 连续3天以上流出
      } else if (days <= -1) {
        score = 30; // 连续1-2天流出
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * 计算散户情绪评分 (20%)
   */
  calculateRetailScore(data) {
    let score = 50; // 基准分

    // 散户资金 = 中单 + 小单
    if (data.medium_net !== null && data.small_net !== null) {
      const mediumFlow = parseFloat(data.medium_net || 0);
      const smallFlow = parseFloat(data.small_net || 0);
      const retailFlow = mediumFlow + smallFlow;

      // 散户流入（通常散户流入是反向指标，但也可能跟风）
      if (retailFlow > 0) {
        score = 60; // 散户流入，谨慎乐观
      } else if (retailFlow < 0) {
        score = 40; // 散户流出，可能主力在吸筹
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
   * 获取中性评分（无数据时）
   */
  getNeutralScore(stockCode) {
    return {
      stockCode: stockCode,
      scoreDate: new Date().toISOString().split('T')[0],
      scores: {
        mainFlow: 50,
        consecutive: 50,
        retail: 50,
        overall: 50.00
      },
      grade: 'D',
      details: {
        mainNetInflow: 0,
        superLargeNetInflow: 0,
        largeNetInflow: 0,
        mediumNetInflow: 0,
        smallNetInflow: 0,
        consecutiveDays: 0,
        trend: 'NO_DATA'
      },
      warning: '无资金流向数据，返回中性评分'
    };
  }

  /**
   * 批量计算资金面评分
   */
  async batchCalculateFundFlowScores(stockCodes) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const score = await this.calculateFundFlowScore(stockCode);
        results.push({
          success: true,
          stockCode: stockCode,
          data: score
        });

        await new Promise(resolve => setTimeout(resolve, 50));

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
   * 获取板块资金流向评分
   */
  async getSectorFundFlowScore(sectorName) {
    // TODO: 实现板块资金流向评分
    // 需要统计板块内所有股票的资金流向
    return {
      sectorName: sectorName,
      score: 50,
      grade: 'D',
      details: {}
    };
  }
}

module.exports = FundFlowScoreService;
