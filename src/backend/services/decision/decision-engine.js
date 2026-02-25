/**
 * Decision Engine
 * 决策引擎
 *
 * 功能：
 * 1. 基于综合评分生成投资决策
 * 2. BUY/SELL/HOLD决策逻辑
 * 3. 置信度计算
 * 4. 理由生成
 * 5. 风险控制
 */

const ScoringService = require('../scoring/scoring-service');
const RiskAssessmentService = require('./risk-assessment-service');
const { Pool } = require('pg');

class DecisionEngine {
  constructor() {
    this.scoringService = new ScoringService();
    this.riskService = new RiskAssessmentService();

    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    // 决策阈值配置
    this.thresholds = {
      buy: {
        strong: 90,    // 强烈买入
        moderate: 80,  // 买入
        light: 70      // 轻仓买入
      },
      sell: {
        strong: 30,    // 清仓
        moderate: 40   // 减仓
      },
      risk: {
        max: 70        // 最大允许风险分
      }
    };
  }

  /**
   * 生成投资决策
   * @param {string} stockCode - 股票代码
   * @param {object} options - 可选参数
   */
  async generateDecision(stockCode, options = {}) {
    try {
      console.log(`\n🎯 生成投资决策: ${stockCode}`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

      const {
        includeRisk = true,
        saveToDb = false
      } = options;

      // 1. 获取综合评分
      console.log(`1️⃣  计算综合评分...`);
      const scoreData = await this.scoringService.calculateOverallScore(stockCode);

      // 2. 风险评估
      let riskData = null;
      if (includeRisk) {
        console.log(`2️⃣  风险评估...`);
        riskData = await this.riskService.assessRisk(stockCode);
      }

      // 3. 生成决策
      console.log(`3️⃣  生成决策...`);
      const decision = this.makeDecision(scoreData, riskData);

      // 4. 计算置信度
      console.log(`4️⃣  计算置信度...`);
      const confidence = this.calculateConfidence(scoreData, riskData, decision);

      // 5. 生成理由
      console.log(`5️⃣  生成决策理由...`);
      const reason = this.generateReason(scoreData, riskData, decision);

      // 6. 构建结果
      const result = {
        stockCode: stockCode,
        decisionDate: new Date().toISOString(),

        // 决策
        decision: decision.type, // BUY/SELL/HOLD
        decisionLevel: decision.level, // 强度级别

        // 评分
        scores: scoreData.scores,
        overallScore: scoreData.overallScore,
        grade: scoreData.grade,

        // 风险
        risk: riskData ? {
          level: riskData.level,
          score: riskData.overallScore,
          details: riskData.details
        } : null,

        // 置信度
        confidence: confidence,

        // 建议
        recommendation: {
          action: decision.action,
          positionSize: decision.positionSize,
          expectedReturn: decision.expectedReturn,
          stopLoss: decision.stopLoss,
          takeProfit: decision.takeProfit,
          holdingPeriod: decision.holdingPeriod
        },

        // 理由
        reason: reason,

        // 元数据
        metadata: {
          scoreCompleteness: this.getScoreCompleteness(scoreData),
          dataFreshness: this.getDataFreshness(scoreData),
          timestamp: new Date().toISOString()
        }
      };

      console.log(`\n✅ 决策生成完成: ${result.decision} - ${result.recommendation.action}`);
      console.log(`   置信度: ${(result.confidence * 100).toFixed(0)}%`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

      // 7. 保存到数据库（可选）
      if (saveToDb) {
        await this.saveDecision(result);
      }

      return result;

    } catch (error) {
      console.error('生成投资决策失败:', error.message);
      throw error;
    }
  }

  /**
   * 做出决策
   */
  makeDecision(scoreData, riskData) {
    const score = scoreData.overallScore;
    const riskScore = riskData ? riskData.overallScore : 50;

    // 检查风险是否过高
    if (riskScore > this.thresholds.risk.max) {
      return {
        type: 'SELL',
        level: 'RISK_CONTROL',
        action: '风险控制',
        reason: '风险过高，建议减仓或清仓'
      };
    }

    // 买入决策
    if (score >= this.thresholds.buy.strong) {
      return {
        type: 'BUY',
        level: 'STRONG',
        action: '重仓买入',
        positionSize: 30,
        expectedReturn: 20,
        stopLoss: -8,
        takeProfit: 30,
        holdingPeriod: '3-6个月'
      };
    } else if (score >= this.thresholds.buy.moderate) {
      return {
        type: 'BUY',
        level: 'MODERATE',
        action: '中仓买入',
        positionSize: 20,
        expectedReturn: 15,
        stopLoss: -8,
        takeProfit: 20,
        holdingPeriod: '1-3个月'
      };
    } else if (score >= this.thresholds.buy.light) {
      return {
        type: 'BUY',
        level: 'LIGHT',
        action: '轻仓买入',
        positionSize: 10,
        expectedReturn: 10,
        stopLoss: -8,
        takeProfit: 15,
        holdingPeriod: '1-2个月'
      };
    }

    // 卖出决策
    else if (score <= this.thresholds.sell.strong) {
      return {
        type: 'SELL',
        level: 'STRONG',
        action: '清仓卖出',
        positionSize: -100,
        expectedReturn: 0,
        stopLoss: 0,
        takeProfit: 0,
        holdingPeriod: '立即'
      };
    } else if (score <= this.thresholds.sell.moderate) {
      return {
        type: 'SELL',
        level: 'MODERATE',
        action: '减仓卖出',
        positionSize: -50,
        expectedReturn: 0,
        stopLoss: 0,
        takeProfit: 0,
        holdingPeriod: '1-2周'
      };
    }

    // 持有决策
    else {
      let action = '持有观望';
      let positionSize = 0;

      if (score >= 60) {
        action = '继续持有，可适当加仓';
        positionSize = 5;
      } else if (score <= 50) {
        action = '谨慎持有，准备减仓';
        positionSize = -10;
      }

      return {
        type: 'HOLD',
        level: score >= 60 ? 'POSITIVE' : (score <= 50 ? 'CAUTIOUS' : 'NEUTRAL'),
        action: action,
        positionSize: positionSize,
        expectedReturn: 5,
        stopLoss: -10,
        takeProfit: 10,
        holdingPeriod: '观望'
      };
    }
  }

  /**
   * 计算置信度
   */
  calculateConfidence(scoreData, riskData, decision) {
    let confidence = 0;

    // 1. 评分确定性 (0-40分)
    const score = scoreData.overallScore;
    if (score >= 90 || score <= 10) {
      confidence += 40; // 极端值更确定
    } else if (score >= 80 || score <= 20) {
      confidence += 30;
    } else if (score >= 70 || score <= 30) {
      confidence += 20;
    } else {
      confidence += 10; // 中间值不确定
    }

    // 2. 数据完整性 (0-30分)
    const completeness = this.getScoreCompleteness(scoreData);
    confidence += completeness * 30;

    // 3. 风险可控性 (0-30分)
    if (riskData) {
      const riskScore = riskData.overallScore;
      if (riskScore <= 30) {
        confidence += 30; // 低风险
      } else if (riskScore <= 50) {
        confidence += 20; // 中低风险
      } else if (riskScore <= 70) {
        confidence += 10; // 中等风险
      }
      // 高风险不加分
    }

    return Math.min(1, confidence / 100);
  }

  /**
   * 生成决策理由
   */
  generateReason(scoreData, riskData, decision) {
    const parts = [];

    // 1. 综合评分说明
    const score = scoreData.overallScore;
    const grade = scoreData.grade;

    if (decision.type === 'BUY') {
      parts.push(`综合评分${score.toFixed(1)}分（${grade}级），表现优异`);
    } else if (decision.type === 'SELL') {
      parts.push(`综合评分${score.toFixed(1)}分（${grade}级），表现不佳`);
    } else {
      parts.push(`综合评分${score.toFixed(1)}分（${grade}级），表现一般`);
    }

    // 2. 各维度分析
    const scores = scoreData.scores;
    const highlights = [];

    if (scores.technical && scores.technical.overall >= 70) {
      highlights.push('技术面强势');
    } else if (scores.technical && scores.technical.overall <= 40) {
      highlights.push('技术面弱势');
    }

    if (scores.fundFlow && scores.fundFlow.overall >= 70) {
      highlights.push('资金持续流入');
    } else if (scores.fundFlow && scores.fundFlow.overall <= 40) {
      highlights.push('资金持续流出');
    }

    if (scores.news && scores.news.overall >= 70) {
      highlights.push('消息面利好');
    } else if (scores.news && scores.news.overall <= 40) {
      highlights.push('消息面利空');
    }

    if (scores.sector && scores.sector.overall >= 70) {
      highlights.push('板块热度高');
    } else if (scores.sector && scores.sector.overall <= 40) {
      highlights.push('板块热度低');
    }

    if (highlights.length > 0) {
      parts.push(highlights.join('，'));
    }

    // 3. 风险说明
    if (riskData) {
      const riskLevel = riskData.level;
      if (riskLevel === 'HIGH') {
        parts.push('风险较高，需谨慎');
      } else if (riskLevel === 'LOW') {
        parts.push('风险可控');
      }
    }

    // 4. 具体建议
    if (decision.type === 'BUY') {
      parts.push(`建议${decision.action}，仓位${decision.positionSize}%`);
    } else if (decision.type === 'SELL') {
      parts.push(`建议${decision.action}`);
    } else {
      parts.push(`建议${decision.action}`);
    }

    return parts.join('，') + '。';
  }

  /**
   * 获取评分完整性
   */
  getScoreCompleteness(scoreData) {
    const scores = scoreData.scores;
    let count = 0;
    let total = 4;

    if (scores.technical && scores.technical.overall > 0) count++;
    if (scores.fundFlow && scores.fundFlow.overall > 0) count++;
    if (scores.news && scores.news.overall > 0) count++;
    if (scores.sector && scores.sector.overall > 0) count++;

    return count / total;
  }

  /**
   * 获取数据新鲜度
   */
  getDataFreshness(scoreData) {
    // TODO: 实现数据新鲜度检查
    // 检查各项数据的更新时间
    return 'FRESH'; // FRESH / STALE / UNKNOWN
  }

  /**
   * 保存决策到数据库
   */
  async saveDecision(decisionData) {
    const query = `
      INSERT INTO decisions (
        stock_code,
        decision_date,
        decision_type,
        technical_score,
        fund_flow_score,
        news_score,
        sector_score,
        overall_score,
        risk_level,
        risk_score,
        confidence,
        position_size,
        expected_return,
        reason,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
      )
      RETURNING id
    `;

    try {
      const values = [
        decisionData.stockCode,
        decisionData.decisionDate.split('T')[0],
        decisionData.decision,
        decisionData.scores.technical?.overall || null,
        decisionData.scores.fundFlow?.overall || null,
        decisionData.scores.news?.overall || null,
        decisionData.scores.sector?.overall || null,
        decisionData.overallScore,
        decisionData.risk?.level || null,
        decisionData.risk?.score || null,
        decisionData.confidence,
        decisionData.recommendation.positionSize,
        decisionData.recommendation.expectedReturn,
        decisionData.reason,
        'PENDING'
      ];

      const result = await this.pool.query(query, values);
      console.log(`✅ 决策已保存到数据库 (ID: ${result.rows[0].id})`);

      return result.rows[0].id;

    } catch (error) {
      console.error('保存决策失败:', error.message);
      return null;
    }
  }

  /**
   * 批量生成决策
   */
  async batchGenerateDecisions(stockCodes, options = {}) {
    console.log(`\n🎯 批量生成决策，共${stockCodes.length}只股票...`);

    const results = [];

    for (let i = 0; i < stockCodes.length; i++) {
      const stockCode = stockCodes[i];
      console.log(`\n[${i + 1}/${stockCodes.length}] ${stockCode}`);

      try {
        const decision = await this.generateDecision(stockCode, options);
        results.push({
          success: true,
          stockCode: stockCode,
          data: decision
        });

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
    const buyCount = results.filter(r => r.success && r.data.decision === 'BUY').length;
    const sellCount = results.filter(r => r.success && r.data.decision === 'SELL').length;
    const holdCount = results.filter(r => r.success && r.data.decision === 'HOLD').length;

    console.log(`\n✅ 批量决策生成完成`);
    console.log(`   总数: ${results.length}`);
    console.log(`   买入: ${buyCount} (${((buyCount / successCount) * 100).toFixed(1)}%)`);
    console.log(`   卖出: ${sellCount} (${((sellCount / successCount) * 100).toFixed(1)}%)`);
    console.log(`   持有: ${holdCount} (${((holdCount / successCount) * 100).toFixed(1)}%)`);
    console.log(`   成功率: ${((successCount / stockCodes.length) * 100).toFixed(1)}%\n`);

    return results;
  }

  /**
   * 获取决策历史
   */
  async getDecisionHistory(stockCode, limit = 50) {
    const query = `
      SELECT * FROM decisions
      WHERE stock_code = $1
      ORDER BY decision_date DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [stockCode, limit]);
      return result.rows;

    } catch (error) {
      console.error('获取决策历史失败:', error.message);
      return [];
    }
  }

  /**
   * 获取最新决策
   */
  async getLatestDecision(stockCode) {
    const query = `
      SELECT * FROM decisions
      WHERE stock_code = $1
      ORDER BY decision_date DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('获取最新决策失败:', error.message);
      return null;
    }
  }
}

module.exports = DecisionEngine;
