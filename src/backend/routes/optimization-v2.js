/**
 * Optimization API Routes
 * 参数优化API路由
 *
 * 提供参数优化相关接口
 */

const express = require('express');
const router = express.Router();
const ParameterOptimizer = require('../services/optimization/parameter-optimizer');

const optimizer = new ParameterOptimizer();

/**
 * POST /api/v2/optimization/grid-search
 * 网格搜索参数优化
 *
 * Body:
 * {
 *   "stockCode": "000001.SZ",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31",
 *   "paramGrid": {
 *     "buyThreshold": [70, 75, 80],
 *     "sellThreshold": [30, 35, 40],
 *     "maxPosition": [0.2, 0.3, 0.4]
 *   },
 *   "targetMetric": "sharpeRatio"
 * }
 */
router.post('/grid-search', async (req, res) => {
  try {
    const { stockCode, startDate, endDate, paramGrid, targetMetric = 'sharpeRatio' } = req.body;

    if (!stockCode || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的优化参数: stockCode, startDate, endDate'
      });
    }

    if (!paramGrid || Object.keys(paramGrid).length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供参数网格 (paramGrid)'
      });
    }

    console.log(`🔍 网格搜索优化请求: ${stockCode}`);

    // 运行网格搜索
    const result = await optimizer.gridSearch(
      stockCode,
      startDate,
      endDate,
      paramGrid,
      targetMetric
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('网格搜索失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/optimization/multi-objective
 * 多目标优化
 *
 * Body:
 * {
 *   "stockCode": "000001.SZ",
 *   "startDate": "2024-01-01",
 *   "endDate": "2024-12-31",
 *   "paramGrid": { ... },
 *   "objectives": {
 *     "sharpeRatio": 0.5,
 *     "totalReturn": 0.3,
 *     "maxDrawdown": 0.2
 *   }
 * }
 */
router.post('/multi-objective', async (req, res) => {
  try {
    const { stockCode, startDate, endDate, paramGrid, objectives } = req.body;

    if (!stockCode || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的优化参数: stockCode, startDate, endDate'
      });
    }

    if (!paramGrid || !objectives) {
      return res.status(400).json({
        success: false,
        error: '请提供参数网格和优化目标'
      });
    }

    console.log(`🎯 多目标优化请求: ${stockCode}`);

    // 运行多目标优化
    const result = await optimizer.multiObjectiveOptimize(
      stockCode,
      startDate,
      endDate,
      paramGrid,
      objectives
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('多目标优化失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/optimization/results/:optimizationId
 * 获取优化结果
 */
router.get('/results/:optimizationId', async (req, res) => {
  try {
    const { optimizationId } = req.params;

    console.log(`📊 获取优化结果: ${optimizationId}`);

    const result = await optimizer.getOptimizationResult(optimizationId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '优化记录不存在'
      });
    }

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('获取优化结果失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/optimization/history
 * 获取优化历史
 *
 * Query:
 *   stockCode: 股票代码（可选）
 *   method: 优化方法（可选）
 *   limit: 返回条数（默认20）
 */
router.get('/history', async (req, res) => {
  try {
    const { stockCode, method, limit = 20 } = req.query;

    console.log(`📜 获取优化历史`);

    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    let query = `
      SELECT
        id, stock_code, start_date, end_date,
        optimization_method, target_metric,
        best_parameters, best_score,
        iterations, created_at
      FROM backtest_optimizations
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (stockCode) {
      query += ` AND stock_code = $${paramIndex++}`;
      params.push(stockCode);
    }

    if (method) {
      query += ` AND optimization_method = $${paramIndex++}`;
      params.push(method);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++}`;
    params.push(limit);

    const result = await pool.query(query, params);
    await pool.end();

    res.json({
      success: true,
      data: {
        total: result.rows.length,
        history: result.rows
      }
    });

  } catch (error) {
    console.error('获取优化历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
