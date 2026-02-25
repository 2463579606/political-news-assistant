/**
 * Backtest API Routes
 * 回测API路由
 *
 * 提供回测执行、结果查询、参数优化等接口
 */

const express = require('express');
const router = express.Router();
const BacktestEngine = require('../services/backtest/backtest-engine');

const backtestEngine = new BacktestEngine();

/**
 * POST /api/v2/backtest/run
 * 运行回测
 *
 * Body:
 * {
 *   "stockCode": "000001.SZ",
 *   "startDate": "2024-01-01",
 *   "endDate": "2025-12-31",
 *   "options": {
 *     "initialCapital": 1000000,
 *     "commissionRate": 0.0003,
 *     "slippageRate": 0.001,
 *     "maxPosition": 0.3,
 *     "stopLoss": -0.08,
 *     "takeProfit": 0.15,
 *     "saveToDb": true
 *   }
 * }
 */
router.post('/run', async (req, res) => {
  try {
    const { stockCode, startDate, endDate, options = {} } = req.body;

    if (!stockCode || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的回测参数: stockCode, startDate, endDate'
      });
    }

    console.log(`🎯 运行回测: ${stockCode} (${startDate} ~ ${endDate})`);

    // 运行回测
    const result = await backtestEngine.runBacktest(
      stockCode,
      startDate,
      endDate,
      options
    );

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('运行回测失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/backtest/batch-run
 * 批量运行回测
 *
 * Body:
 * {
 *   "stockCodes": ["000001.SZ", "600000.SH"],
 *   "startDate": "2024-01-01",
 *   "endDate": "2025-12-31",
 *   "options": { ... }
 * }
 */
router.post('/batch-run', async (req, res) => {
  try {
    const { stockCodes, startDate, endDate, options = {} } = req.body;

    if (!stockCodes || !Array.isArray(stockCodes) || stockCodes.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码数组'
      });
    }

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: '请提供完整的回测参数: startDate, endDate'
      });
    }

    console.log(`🎯 批量回测: ${stockCodes.length}只股票`);

    // 批量运行回测
    const results = await backtestEngine.batchBacktest(
      stockCodes,
      startDate,
      endDate,
      options
    );

    res.json({
      success: true,
      data: {
        total: results.length,
        success: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results: results
      }
    });

  } catch (error) {
    console.error('批量回测失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/backtest/results/:backtestId
 * 获取回测结果
 *
 * Query:
 *   includeTrades: 是否包含交易记录 (默认true)
 */
router.get('/results/:backtestId', async (req, res) => {
  try {
    const { backtestId } = req.params;
    const includeTrades = req.query.includeTrades !== 'false';

    console.log(`📊 获取回测结果: ${backtestId}`);

    // 获取回测结果
    const result = await backtestEngine.getBacktestResult(backtestId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '回测记录不存在'
      });
    }

    // 是否包含交易记录
    let trades = [];
    if (includeTrades) {
      trades = await backtestEngine.getBacktestTrades(backtestId);
    }

    res.json({
      success: true,
      data: {
        result: result,
        trades: trades
      }
    });

  } catch (error) {
    console.error('获取回测结果失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/backtest/results/:backtestId/report
 * 获取回测报告
 */
router.get('/results/:backtestId/report', async (req, res) => {
  try {
    const { backtestId } = req.params;

    console.log(`📄 生成回测报告: ${backtestId}`);

    // 获取回测结果
    const result = await backtestEngine.getBacktestResult(backtestId);
    const trades = await backtestEngine.getBacktestTrades(backtestId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: '回测记录不存在'
      });
    }

    // 解析性能数据
    const performance = result.metrics ? JSON.parse(result.metrics) : {};
    const equityCurve = result.equity_curve ? JSON.parse(result.equity_curve) : [];

    // 生成报告
    const report = {
      summary: {
        stockCode: result.stock_code,
        backtestPeriod: `${result.start_date} ~ ${result.end_date}`,
        initialCapital: result.initial_capital,
        finalCapital: result.final_capital,
        totalReturn: (result.total_return * 100).toFixed(2) + '%',
        annualReturn: (result.annual_return * 100).toFixed(2) + '%',
        maxDrawdown: (result.max_drawdown * 100).toFixed(2) + '%',
        sharpeRatio: result.sharpe_ratio ? result.sharpe_ratio.toFixed(2) : 'N/A',
        winRate: result.win_rate ? (result.win_rate * 100).toFixed(2) + '%' : 'N/A',
        totalTrades: result.total_trades
      },
      performance: performance,
      equity: {
        curve: equityCurve,
        high: equityCurve.length > 0 ? Math.max(...equityCurve.map(e => e.equity)) : 0,
        low: equityCurve.length > 0 ? Math.min(...equityCurve.map(e => e.equity)) : 0
      },
      trades: trades,
      parameters: result.parameters ? JSON.parse(result.parameters) : {}
    };

    res.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('生成回测报告失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/backtest/history
 * 获取回测历史列表
 *
 * Query:
 *   stockCode: 股票代码（可选）
 *   limit: 返回条数（默认20）
 *   offset: 偏移量（默认0）
 */
router.get('/history', async (req, res) => {
  try {
    const { stockCode, limit = 20, offset = 0 } = req.query;

    console.log(`📜 获取回测历史`);

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
        initial_capital, final_capital,
        total_return, annual_return,
        max_drawdown, sharpe_ratio, win_rate,
        total_trades, created_at
      FROM backtest_results
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (stockCode) {
      query += ` AND stock_code = $${paramIndex++}`;
      params.push(stockCode);
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

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
    console.error('获取回测历史失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/v2/backtest/results/:backtestId
 * 删除回测结果
 */
router.delete('/results/:backtestId', async (req, res) => {
  try {
    const { backtestId } = req.params;

    console.log(`🗑️  删除回测结果: ${backtestId}`);

    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    await pool.query('DELETE FROM backtest_results WHERE id = $1', [backtestId]);
    await pool.end();

    res.json({
      success: true,
      message: '回测结果已删除'
    });

  } catch (error) {
    console.error('删除回测结果失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/backtest/compare
 * 对比多个回测结果
 *
 * Body:
 * {
 *   "backtestIds": [1, 2, 3]
 * }
 */
router.post('/compare', async (req, res) => {
  try {
    const { backtestIds } = req.body;

    if (!backtestIds || !Array.isArray(backtestIds) || backtestIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供回测ID数组'
      });
    }

    console.log(`📊 对比回测结果: ${backtestIds.length}个`);

    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    const query = `
      SELECT
        id, stock_code, start_date, end_date,
        initial_capital, final_capital,
        total_return, annual_return,
        max_drawdown, sharpe_ratio, win_rate,
        total_trades, parameters
      FROM backtest_results
      WHERE id = ANY($1)
      ORDER BY total_return DESC
    `;

    const result = await pool.query(query, [backtestIds]);
    await pool.end();

    // 生成对比报告
    const comparison = {
      count: result.rows.length,
      results: result.rows,
      best: result.rows[0] || null,
      worst: result.rows[result.rows.length - 1] || null,
      avg: {
        totalReturn: result.rows.length > 0
          ? result.rows.reduce((sum, r) => sum + r.total_return, 0) / result.rows.length
          : 0,
        sharpeRatio: result.rows.length > 0
          ? result.rows.reduce((sum, r) => sum + (r.sharpe_ratio || 0), 0) / result.rows.length
          : 0,
        winRate: result.rows.length > 0
          ? result.rows.reduce((sum, r) => sum + (r.win_rate || 0), 0) / result.rows.length
          : 0
      }
    };

    res.json({
      success: true,
      data: comparison
    });

  } catch (error) {
    console.error('对比回测结果失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
