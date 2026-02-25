/**
 * Scoring Service
 * 综合评分服务
 *
 * 功能：
 * 1. 整合技术面、资金面、消息面、板块面四个维度的评分
 * 2. 加权计算综合评分
 * 3. 生成评分报告
 * 4. 提供评分历史查询
 */

const TechnicalScoreService = require('./technical-score-service');
const FundFlowScoreService = require('./fund-flow-score-service');
const NewsScoreService = require('./news-score-service');
const SectorScoreService = require('./sector-score-service');
const { Pool } = require('pg');

class ScoringService {
  constructor() {
    this.technicalService = new TechnicalScoreService();
    this.fundFlowService = new FundFlowScoreService();
    this.newsService = new NewsScoreService();
    this.sectorService = new SectorScoreService();

    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 权重配置
    this.weights = {
      technical: 0.30,  // 技术面 30%
      fundFlow: 0.20,   // 资金面 20%
      news: 0.30,       // 消息面 30%
      sector: 0.20      // 板块面 20%
    };
  }

  /**
   * 计算综合评分
   * @param {string} stockCode - 股票代码
   * @param {object} options - 可选参数
   */
  async calculateOverallScore(stockCode, options = {}) {
    try {
      console.log(`\n🎯 开始计算综合评分: ${stockCode}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const {
        includeTechnical = true,
        includeFundFlow = true,
        includeNews = true,
        includeSector = true
      } = options;

      // 1. 计算各维度评分
      const scores = {};

      if (includeTechnical) {
        console.log(`\n1️⃣  技术面评分...`);
        const technicalScore = await this.technicalService.calculateTechnicalScore(stockCode);
        scores.technical = technicalScore;
        console.log(`   得分: ${technicalScore.scores.overall} (${technicalScore.grade})`);
      }

      if (includeFundFlow) {
        console.log(`\n2️⃣  资金面评分...`);
        const fundFlowScore = await this.fundFlowService.calculateFundFlowScore(stockCode);
        scores.fundFlow = fundFlowScore;
        console.log(`   得分: ${fundFlowScore.scores.overall} (${fundFlowScore.grade})`);
      }

      if (includeNews) {
        console.log(`\n3️⃣  消息面评分...`);
        const newsScore = await this.newsService.calculateNewsScore(stockCode);
        scores.news = newsScore;
        console.log(`   得分: ${newsScore.scores.overall} (${newsScore.grade})`);
      }

      if (includeSector) {
        console.log(`\n4️⃣  板块面评分...`);
        const sectorScore = await this.sectorService.calculateSectorScore(stockCode);
        scores.sector = sectorScore;
        console.log(`   得分: ${sectorScore.scores.overall} (${sectorScore.grade})`);
      }

      // 2. 加权计算综合评分
      console.log(`\n5️⃣  综合评分计算...`);

      let overallScore = 0;
      let totalWeight = 0;

      if (scores.technical) {
        overallScore += scores.technical.scores.overall * this.weights.technical;
        totalWeight += this.weights.technical;
      }

      if (scores.fundFlow) {
        overallScore += scores.fundFlow.scores.overall * this.weights.fundFlow;
        totalWeight += this.weights.fundFlow;
      }

      if (scores.news) {
        overallScore += scores.news.scores.overall * this.weights.news;
        totalWeight += this.weights.news;
      }

      if (scores.sector) {
        overallScore += scores.sector.scores.overall * this.weights.sector;
        totalWeight += this.weights.sector;
      }

      // 归一化（如果某些维度没有数据）
      overallScore = totalWeight > 0 ? overallScore / totalWeight : 50;

      // 3. 生成结果
      const result = {
        stockCode: stockCode,
        scoreDate: new Date().toISOString().split('T')[0],
        overallScore: parseFloat(overallScore.toFixed(2)),
        grade: this.getGrade(overallScore),
        level: this.getLevel(overallScore),
        recommendation: this.getRecommendation(overallScore),
        scores: {
          technical: scores.technical ? scores.technical.scores : null,
          fundFlow: scores.fundFlow ? scores.fundFlow.scores : null,
          news: scores.news ? scores.news.scores : null,
          sector: scores.sector ? scores.sector.scores : null
        },
        weights: this.weights,
        details: {
          technical: scores.technical ? scores.technical.details : null,
          fundFlow: scores.fundFlow ? scores.fundFlow.details : null,
          news: scores.news ? scores.news.details : null,
          sector: scores.sector ? scores.sector.details : null
        }
      };

      console.log(`\n✅ 综合评分: ${result.overallScore} (${result.grade})`);
      console.log(`   建议: ${result.recommendation.action}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      return result;

    } catch (error) {
      console.error('计算综合评分失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取评分等级
   */
  getGrade(score) {
    if (score >= 90) return 'S';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }

  /**
   * 获取评级等级
   */
  getLevel(score) {
    if (score >= 90) return '强烈推荐';
    if (score >= 80) return '推荐';
    if (score >= 70) return '谨慎推荐';
    if (score >= 60) return '观望';
    if (score >= 50) return '中性';
    if (score >= 40) return '谨慎';
    return '规避';
  }

  /**
   * 获取操作建议
   */
  getRecommendation(score) {
    if (score >= 90) {
      return {
        action: '重仓买入',
        position: 30, // 30%仓位
        confidence: 0.90,
        reason: '综合评分极高，四个维度均表现优异'
      };
    } else if (score >= 80) {
      return {
        action: '中仓买入',
        position: 20, // 20%仓位
        confidence: 0.80,
        reason: '综合评分高，多维度表现良好'
      };
    } else if (score >= 70) {
      return {
        action: '轻仓买入',
        position: 10, // 10%仓位
        confidence: 0.70,
        reason: '综合评分较好，可适当参与'
      };
    } else if (score >= 60) {
      return {
        action: '持有观望',
        position: 0, // 不加仓
        confidence: 0.60,
        reason: '综合评分中等，建议持有观望'
      };
    } else if (score >= 50) {
      return {
        action: '谨慎持有',
        position: 0,
        confidence: 0.50,
        reason: '综合评分偏低，建议谨慎'
      };
    } else if (score >= 40) {
      return {
        action: '考虑减仓',
        position: -50, // 减仓50%
        confidence: 0.60,
        reason: '综合评分较差，建议减仓'
      };
    } else {
      return {
        action: '清仓卖出',
        position: -100, // 清仓
        confidence: 0.80,
        reason: '综合评分极差，建议清仓'
      };
    }
  }

  /**
   * 批量计算综合评分
   */
  async batchCalculateScores(stockCodes, options = {}) {
    console.log(`\n📊 批量计算综合评分，共${stockCodes.length}只股票...`);

    const results = [];

    for (let i = 0; i < stockCodes.length; i++) {
      const stockCode = stockCodes[i];
      console.log(`\n[${i + 1}/${stockCodes.length}] ${stockCode}`);

      try {
        const score = await this.calculateOverallScore(stockCode, options);
        results.push({
          success: true,
          stockCode: stockCode,
          data: score
        });

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`   ❌ 失败: ${error.message}`);
        results.push({
          success: false,
          stockCode: stockCode,
          error: error.message
        });
      }
    }

    // 统计结果
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`\n✅ 批量评分完成`);
    console.log(`   成功: ${successCount}`);
    console.log(`   失败: ${failCount}`);
    console.log(`   成功率: ${((successCount / stockCodes.length) * 100).toFixed(1)}%\n`);

    return results;
  }

  /**
   * 获取评分排行榜
   */
  async getScoreRanking(limit = 20) {
    // TODO: 实现评分排行榜
    // 需要先建立评分历史表
    return {
      ranking: [],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 保存评分到数据库
   */
  async saveScore(scoreData) {
    // TODO: 实现评分数据保存
    // 需要先创建评分历史表
    return {
      success: true,
      scoreId: null
    };
  }

  /**
   * 获取评分历史
   */
  async getScoreHistory(stockCode, days = 30) {
    // TODO: 实现评分历史查询
    return {
      stockCode: stockCode,
      history: []
    };
  }

  /**
   * 比较两只股票的评分
   */
  async compareStocks(stockCode1, stockCode2) {
    try {
      console.log(`\n⚖️  比较股票评分: ${stockCode1} vs ${stockCode2}`);

      const [score1, score2] = await Promise.all([
        this.calculateOverallScore(stockCode1),
        this.calculateOverallScore(stockCode2)
      ]);

      const diff = score1.overallScore - score2.overallScore;

      return {
        stock1: score1,
        stock2: score2,
        comparison: {
          scoreDiff: parseFloat(diff.toFixed(2)),
          winner: diff > 0 ? stockCode1 : (diff < 0 ? stockCode2 : 'TIE'),
          recommendation: diff > 5 ? stockCode1 : (diff < -5 ? stockCode2 : 'SIMILAR')
        }
      };

    } catch (error) {
      console.error('比较股票评分失败:', error.message);
      throw error;
    }
  }
}

module.exports = ScoringService;
