/**
 * Sector Score Service
 * 板块面评分服务
 *
 * 功能：
 * 1. 计算板块热度评分
 * 2. 计算板块资金流向评分
 * 3. 综合板块面评分
 */

const SectorMapper = require('../news-analysis/sector-mapper');
const { Pool } = require('pg');

class SectorScoreService {
  constructor() {
    this.sectorMapper = new SectorMapper();
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 计算板块面综合评分
   * @param {string} stockCode - 股票代码
   */
  async calculateSectorScore(stockCode) {
    try {
      console.log(`🏢 计算板块面评分: ${stockCode}`);

      // 1. 获取股票所属板块
      const sectors = await this.getStockSectors(stockCode);

      if (!sectors || sectors.length === 0) {
        return this.getNeutralScore(stockCode);
      }

      // 2. 计算各板块的评分
      const sectorScores = [];

      for (const sector of sectors) {
        const heatScore = await this.calculateSectorHeatScore(sector, 7);
        const flowScore = await this.calculateSectorFlowScore(sector, 7);

        const overallSectorScore = (heatScore * 0.50 + flowScore * 0.50);

        sectorScores.push({
          sectorName: sector,
          heatScore: heatScore,
          flowScore: flowScore,
          overallScore: overallSectorScore
        });
      }

      // 3. 综合所有板块的评分（取加权平均）
      const totalScore = sectorScores.reduce((sum, s) => sum + s.overallScore, 0);
      const avgScore = totalScore / sectorScores.length;

      const result = {
        stockCode: stockCode,
        scoreDate: new Date().toISOString().split('T')[0],
        scores: {
          heat: parseFloat((sectorScores.reduce((sum, s) => sum + s.heatScore, 0) / sectorScores.length).toFixed(2)),
          flow: parseFloat((sectorScores.reduce((sum, s) => sum + s.flowScore, 0) / sectorScores.length).toFixed(2)),
          overall: parseFloat(avgScore.toFixed(2))
        },
        grade: this.getGrade(avgScore),
        details: {
          sectors: sectorScores,
          primarySector: sectorScores[0] // 主要板块
        }
      };

      console.log(`✅ 板块面评分: ${result.scores.overall} (${result.grade})`);

      return result;

    } catch (error) {
      console.error('计算板块面评分失败:', error.message);
      return this.getNeutralScore(stockCode);
    }
  }

  /**
   * 获取股票所属板块
   */
  async getStockSectors(stockCode) {
    // 从news_events中查找该股票涉及的事件，提取板块
    const query = `
      SELECT DISTINCT impact_sectors
      FROM news_events
      WHERE impact_stocks::jsonb ? $1
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      LIMIT 10
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);

      // 收集所有板块
      const sectors = new Set();
      result.rows.forEach(row => {
        const impactSectors = row.impact_sectors || [];
        impactSectors.forEach(sector => sectors.add(sector));
      });

      // 如果没有找到，返回空数组（无法识别板块）
      // TODO: 可以在这里维护一个股票到板块的映射表

      return Array.from(sectors);

    } catch (error) {
      console.error('获取股票板块失败:', error.message);
      return [];
    }
  }

  /**
   * 计算板块热度评分 (50%)
   */
  async calculateSectorHeatScore(sectorName, days = 7) {
    try {
      // 统计最近N天内该板块的新闻事件
      const query = `
        SELECT
          COUNT(*) as event_count,
          AVG(importance_score) as avg_importance,
          SUM(CASE WHEN sentiment = 'positive' THEN 1 ELSE 0 END) as positive_count,
          SUM(CASE WHEN sentiment = 'negative' THEN 1 ELSE 0 END) as negative_count
        FROM news_events
        WHERE impact_sectors::jsonb ? $1
        AND created_at >= CURRENT_DATE - INTERVAL '${days} days'
      `;

      const result = await this.pool.query(query, [sectorName]);

      if (result.rows.length === 0) {
        return 50;
      }

      const row = result.rows[0];
      const eventCount = parseInt(row.event_count || 0);

      if (eventCount === 0) {
        return 50;
      }

      // 基础热度分（事件数量）
      let heatScore = Math.min(50, eventCount * 5);

      // 重要性加权
      const avgImportance = parseFloat(row.avg_importance || 5);
      if (avgImportance >= 8) {
        heatScore += 25;
      } else if (avgImportance >= 6) {
        heatScore += 15;
      } else if (avgImportance >= 4) {
        heatScore += 5;
      }

      // 情感倾向调整
      const positiveCount = parseInt(row.positive_count || 0);
      const negativeCount = parseInt(row.negative_count || 0);

      if (positiveCount > negativeCount * 2) {
        heatScore += 25; // 明显正面
      } else if (positiveCount > negativeCount) {
        heatScore += 10; // 略微正面
      } else if (negativeCount > positiveCount * 2) {
        heatScore -= 25; // 明显负面
      } else if (negativeCount > positiveCount) {
        heatScore -= 10; // 略微负面
      }

      return Math.max(0, Math.min(100, heatScore));

    } catch (error) {
      console.error(`计算板块${sectorName}热度评分失败:`, error.message);
      return 50;
    }
  }

  /**
   * 计算板块资金流向评分 (50%)
   */
  async calculateSectorFlowScore(sectorName, days = 7) {
    try {
      // TODO: 实现板块资金流向统计
      // 当前简化处理，返回中性评分
      // 实际应该统计板块内所有股票的资金流向总和

      return 50;

    } catch (error) {
      console.error(`计算板块${sectorName}资金流向评分失败:`, error.message);
      return 50;
    }
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
        heat: 50,
        flow: 50,
        overall: 50.00
      },
      grade: 'D',
      details: {
        sectors: [],
        primarySector: null
      },
      warning: '无法获取股票板块信息，返回中性评分'
    };
  }

  /**
   * 获取板块热度排名
   */
  async getSectorHeatRanking(limit = 20) {
    // TODO: 实现板块热度排名
    return {
      ranking: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 批量计算板块面评分
   */
  async batchCalculateSectorScores(stockCodes) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const score = await this.calculateSectorScore(stockCode);
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
}

module.exports = SectorScoreService;
