/**
 * Risk Assessment Service
 * 风险评估服务
 *
 * 功能：
 * 1. 波动率风险评估
 * 2. 最大回撤风险评估
 * 3. 仓位风险评估
 * 4. 集中度风险评估
 * 5. 综合风险等级评定
 */

const { Pool } = require('pg');

class RiskAssessmentService {
  constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 风险权重配置
    this.weights = {
      volatility: 0.30,    // 波动率风险
      drawdown: 0.30,     // 最大回撤风险
      position: 0.20,     // 仓位风险
      concentration: 0.20  // 集中度风险
    };
  }

  /**
   * 综合风险评估
   * @param {string} stockCode - 股票代码
   */
  async assessRisk(stockCode) {
    try {
      console.log(`⚠️  风险评估: ${stockCode}`);

      // 1. 计算各维度风险
      const volatilityRisk = await this.calculateVolatilityRisk(stockCode);
      const drawdownRisk = await this.calculateDrawdownRisk(stockCode);
      const positionRisk = await this.calculatePositionRisk(stockCode);
      const concentrationRisk = await this.calculateConcentrationRisk(stockCode);

      // 2. 加权计算综合风险
      const overallScore = (
        volatilityRisk.score * this.weights.volatility +
        drawdownRisk.score * this.weights.drawdown +
        positionRisk.score * this.weights.position +
        concentrationRisk.score * this.weights.concentration
      );

      // 3. 确定风险等级
      const level = this.getRiskLevel(overallScore);

      const result = {
        stockCode: stockCode,
        assessmentDate: new Date().toISOString().split('T')[0],
        overallScore: parseFloat(overallScore.toFixed(2)),
        level: level,
        details: {
          volatility: volatilityRisk,
          drawdown: drawdownRisk,
          position: positionRisk,
          concentration: concentrationRisk
        },
        weights: this.weights,
        recommendation: this.getRiskRecommendation(level)
      };

      console.log(`✅ 风险评估完成: ${result.overallScore} (${result.level})`);

      return result;

    } catch (error) {
      console.error('风险评估失败:', error.message);
      throw error;
    }
  }

  /**
   * 计算波动率风险
   */
  async calculateVolatilityRisk(stockCode) {
    try {
      // 获取最近60天的价格数据
      const query = `
        SELECT close_price
        FROM market_data
        WHERE stock_code = $1
        ORDER BY trade_date DESC
        LIMIT 60
      `;

      const result = await this.pool.query(query, [stockCode]);

      if (result.rows.length < 20) {
        return {
          type: 'volatility',
          score: 50,
          level: 'MEDIUM',
          details: { error: '数据不足' }
        };
      }

      // 计算日收益率
      const prices = result.rows.map(row => parseFloat(row.close_price)).reverse();
      const returns = [];

      for (let i = 1; i < prices.length; i++) {
        const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
        returns.push(dailyReturn);
      }

      // 计算标准差（波动率）
      const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      const volatility = Math.sqrt(variance);

      // 年化波动率
      const annualizedVolatility = volatility * Math.sqrt(252);

      // 风险评分
      let score, level;

      if (annualizedVolatility < 0.20) {
        score = 0 + (annualizedVolatility / 0.20) * 20;
        level = 'LOW';
      } else if (annualizedVolatility < 0.40) {
        score = 20 + ((annualizedVolatility - 0.20) / 0.20) * 30;
        level = 'MEDIUM';
      } else {
        score = 50 + Math.min(50, ((annualizedVolatility - 0.40) / 0.40) * 50);
        level = 'HIGH';
      }

      return {
        type: 'volatility',
        score: Math.min(100, Math.max(0, score)),
        level: level,
        details: {
          volatility: parseFloat(volatility.toFixed(4)),
          annualizedVolatility: parseFloat(annualizedVolatility.toFixed(4)),
          annualizedVolatilityPercent: (annualizedVolatility * 100).toFixed(2) + '%'
        }
      };

    } catch (error) {
      console.error('计算波动率风险失败:', error.message);
      return {
        type: 'volatility',
        score: 50,
        level: 'MEDIUM',
        details: { error: error.message }
      };
    }
  }

  /**
   * 计算最大回撤风险
   */
  async calculateDrawdownRisk(stockCode) {
    try {
      // 获取最近60天的价格数据
      const query = `
        SELECT close_price
        FROM market_data
        WHERE stock_code = $1
        ORDER BY trade_date ASC
        LIMIT 60
      `;

      const result = await this.pool.query(query, [stockCode]);

      if (result.rows.length < 20) {
        return {
          type: 'drawdown',
          score: 50,
          level: 'MEDIUM',
          details: { error: '数据不足' }
        };
      }

      const prices = result.rows.map(row => parseFloat(row.close_price));

      // 计算最大回撤
      let maxDrawdown = 0;
      let peak = prices[0];

      for (let i = 1; i < prices.length; i++) {
        if (prices[i] > peak) {
          peak = prices[i];
        } else {
          const drawdown = (peak - prices[i]) / peak;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
        }
      }

      // 风险评分
      let score, level;

      if (maxDrawdown < 0.10) {
        score = (maxDrawdown / 0.10) * 20;
        level = 'LOW';
      } else if (maxDrawdown < 0.25) {
        score = 20 + ((maxDrawdown - 0.10) / 0.15) * 30;
        level = 'MEDIUM';
      } else {
        score = 50 + Math.min(50, ((maxDrawdown - 0.25) / 0.25) * 50);
        level = 'HIGH';
      }

      return {
        type: 'drawdown',
        score: Math.min(100, Math.max(0, score)),
        level: level,
        details: {
          maxDrawdown: parseFloat(maxDrawdown.toFixed(4)),
          maxDrawdownPercent: (maxDrawdown * 100).toFixed(2) + '%'
        }
      };

    } catch (error) {
      console.error('计算最大回撤风险失败:', error.message);
      return {
        type: 'drawdown',
        score: 50,
        level: 'MEDIUM',
        details: { error: error.message }
      };
    }
  }

  /**
   * 计算仓位风险
   */
  async calculatePositionRisk(stockCode) {
    try {
      // TODO: 实现仓位风险评估
      // 需要用户持仓数据
      // 当前简化处理

      return {
        type: 'position',
        score: 30, // 假设轻仓，低风险
        level: 'LOW',
        details: {
          currentPosition: 0,
          maxPosition: 30,
          recommendation: '建议轻仓参与'
        }
      };

    } catch (error) {
      console.error('计算仓位风险失败:', error.message);
      return {
        type: 'position',
        score: 50,
        level: 'MEDIUM',
        details: { error: error.message }
      };
    }
  }

  /**
   * 计算集中度风险
   */
  async calculateConcentrationRisk(stockCode) {
    try {
      // TODO: 实现集中度风险评估
      // 需要用户持仓的板块分布数据
      // 当前简化处理

      return {
        type: 'concentration',
        score: 30, // 假设分散投资，低风险
        level: 'LOW',
        details: {
          sectorConcentration: 20, // 20%集中在单一板块
          recommendation: '分散投资'
        }
      };

    } catch (error) {
      console.error('计算集中度风险失败:', error.message);
      return {
        type: 'concentration',
        score: 50,
        level: 'MEDIUM',
        details: { error: error.message }
      };
    }
  }

  /**
   * 获取风险等级
   */
  getRiskLevel(score) {
    if (score <= 30) {
      return 'LOW';
    } else if (score <= 70) {
      return 'MEDIUM';
    } else {
      return 'HIGH';
    }
  }

  /**
   * 获取风险建议
   */
  getRiskRecommendation(level) {
    if (level === 'LOW') {
      return {
        action: '风险可控，可正常参与',
        maxPosition: 30,
        stopLoss: -8
      };
    } else if (level === 'MEDIUM') {
      return {
        action: '风险适中，建议轻仓参与',
        maxPosition: 20,
        stopLoss: -6
      };
    } else {
      return {
        action: '风险较高，建议谨慎或观望',
        maxPosition: 10,
        stopLoss: -4
      };
    }
  }

  /**
   * 批量风险评估
   */
  async batchAssessRisk(stockCodes) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const risk = await this.assessRisk(stockCode);
        results.push({
          success: true,
          stockCode: stockCode,
          data: risk
        });

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
}

module.exports = RiskAssessmentService;
