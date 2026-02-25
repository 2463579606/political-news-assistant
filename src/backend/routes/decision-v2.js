/**
 * Decision Engine API Routes
 * 决策引擎API路由
 *
 * 提供投资决策生成、风险评估、决策查询等接口
 */

const express = require('express');
const router = express.Router();
const DecisionEngine = require('../services/decision/decision-engine');
const RiskAssessmentService = require('../services/decision/risk-assessment-service');
const ScoringService = require('../services/scoring/scoring-service');

const decisionEngine = new DecisionEngine();
const riskService = new RiskAssessmentService();
const scoringService = new ScoringService();

/**
 * POST /api/v2/decision/generate
 * 生成投资决策
 *
 * Body:
 * {
 *   "stockCode": "000001.SZ",
 *   "includeRisk": true,
 *   "saveToDb": false
 * }
 */
router.post('/generate', async (req, res) => {
  try {
    const { stockCode, includeRisk = true, saveToDb = false } = req.body;

    if (!stockCode) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码'
      });
    }

    console.log(`🎯 生成投资决策: ${stockCode}`);

    // 生成决策
    const decision = await decisionEngine.generateDecision(stockCode, {
      includeRisk,
      saveToDb
    });

    res.json({
      success: true,
      data: decision
    });

  } catch (error) {
    console.error('生成投资决策失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/decision/batch-generate
 * 批量生成投资决策
 *
 * Body:
 * {
 *   "stockCodes": ["000001.SZ", "600000.SH"],
 *   "includeRisk": true,
 *   "saveToDb": false
 * }
 */
router.post('/batch-generate', async (req, res) => {
  try {
    const { stockCodes, includeRisk = true, saveToDb = false } = req.body;

    if (!stockCodes || !Array.isArray(stockCodes)) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码数组'
      });
    }

    console.log(`🎯 批量生成投资决策，共${stockCodes.length}只股票`);

    // 批量生成决策
    const results = await decisionEngine.batchGenerateDecisions(stockCodes, {
      includeRisk,
      saveToDb
    });

    res.json({
      success: true,
      data: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        decisions: results
      }
    });

  } catch (error) {
    console.error('批量生成投资决策失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/decision/history/:stockCode
 * 获取决策历史
 *
 * Query:
 *   limit: 返回条数 (默认50)
 */
router.get('/history/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    console.log(`📜 获取决策历史: ${stockCode}`);

    const history = await decisionEngine.getDecisionHistory(stockCode, limit);

    res.json({
      success: true,
      data: {
        stockCode: stockCode,
        total: history.length,
        history: history
      }
    });

  } catch (error) {
    console.error('获取决策历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/decision/latest/:stockCode
 * 获取最新决策
 */
router.get('/latest/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;

    console.log(`📋 获取最新决策: ${stockCode}`);

    const latest = await decisionEngine.getLatestDecision(stockCode);

    if (!latest) {
      return res.status(404).json({
        success: false,
        error: '未找到决策记录'
      });
    }

    res.json({
      success: true,
      data: latest
    });

  } catch (error) {
    console.error('获取最新决策失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/decision/risk/assess
 * 风险评估
 *
 * Body:
 * {
 *   "stockCode": "000001.SZ"
 * }
 */
router.post('/risk/assess', async (req, res) => {
  try {
    const { stockCode } = req.body;

    if (!stockCode) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码'
      });
    }

    console.log(`⚠️  风险评估: ${stockCode}`);

    const risk = await riskService.assessRisk(stockCode);

    res.json({
      success: true,
      data: risk
    });

  } catch (error) {
    console.error('风险评估失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/decision/risk/batch-assess
 * 批量风险评估
 *
 * Body:
 * {
 *   "stockCodes": ["000001.SZ", "600000.SH"]
 * }
 */
router.post('/risk/batch-assess', async (req, res) => {
  try {
    const { stockCodes } = req.body;

    if (!stockCodes || !Array.isArray(stockCodes)) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码数组'
      });
    }

    console.log(`⚠️  批量风险评估，共${stockCodes.length}只股票`);

    const results = await riskService.batchAssessRisk(stockCodes);

    res.json({
      success: true,
      data: {
        total: results.length,
        results: results
      }
    });

  } catch (error) {
    console.error('批量风险评估失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/decision/scoring/calculate
 * 计算综合评分
 *
 * Body:
 * {
 *   "stockCode": "000001.SZ",
 *   "includeFactors": ["technical", "fundFlow", "news", "sector"]
 * }
 */
router.post('/scoring/calculate', async (req, res) => {
  try {
    const { stockCode, includeFactors } = req.body;

    if (!stockCode) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码'
      });
    }

    console.log(`📊 计算综合评分: ${stockCode}`);

    const options = {};
    if (includeFactors) {
      options.includeTechnical = includeFactors.includes('technical');
      options.includeFundFlow = includeFactors.includes('fundFlow');
      options.includeNews = includeFactors.includes('news');
      options.includeSector = includeFactors.includes('sector');
    }

    const score = await scoringService.calculateOverallScore(stockCode, options);

    res.json({
      success: true,
      data: score
    });

  } catch (error) {
    console.error('计算综合评分失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/decision/scoring/batch-calculate
 * 批量计算综合评分
 *
 * Body:
 * {
 *   "stockCodes": ["000001.SZ", "600000.SH"]
 * }
 */
router.post('/scoring/batch-calculate', async (req, res) => {
  try {
    const { stockCodes } = req.body;

    if (!stockCodes || !Array.isArray(stockCodes)) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码数组'
      });
    }

    console.log(`📊 批量计算综合评分，共${stockCodes.length}只股票`);

    const results = await scoringService.batchCalculateScores(stockCodes);

    res.json({
      success: true,
      data: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        scores: results
      }
    });

  } catch (error) {
    console.error('批量计算综合评分失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/decision/:decisionId/execute
 * 执行决策（标记为已执行）
 *
 * Body:
 * {
 *   "executedAt": "2026-02-25T10:00:00Z",
 *   "price": 15.50
 * }
 */
router.post('/:decisionId/execute', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { executedAt, price } = req.body;

    // TODO: 实现决策执行逻辑
    // 更新decision记录的status为EXECUTED

    res.json({
      success: true,
      message: '决策执行成功',
      data: {
        decisionId: decisionId,
        executedAt: executedAt || new Date().toISOString(),
        price: price
      }
    });

  } catch (error) {
    console.error('执行决策失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/v2/decision/:decisionId/result
 * 更新决策结果
 *
 * Body:
 * {
 *   "actualReturn": 12.5,
 *   "holdingDays": 15
 * }
 */
router.put('/:decisionId/result', async (req, res) => {
  try {
    const { decisionId } = req.params;
    const { actualReturn, holdingDays } = req.body;

    // TODO: 实现决策结果更新逻辑
    // 更新decision记录的actual_return和holding_days

    res.json({
      success: true,
      message: '决策结果更新成功',
      data: {
        decisionId: decisionId,
        actualReturn: actualReturn,
        holdingDays: holdingDays
      }
    });

  } catch (error) {
    console.error('更新决策结果失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
