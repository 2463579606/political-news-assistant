/**
 * Fund Flow API Routes v2
 * 资金流向API路由
 *
 * 提供资金流向数据查询和分析接口
 */

const express = require('express');
const router = express.Router();
const FundFlowService = require('../services/fund-flow/fund-flow-service');

const fundFlowService = new FundFlowService();

/**
 * GET /api/v2/fund-flow/stock/:code
 * 获取股票资金流向数据
 *
 * Query Parameters:
 * - days: 查询天数，默认5
 */
router.get('/stock/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { days = 5 } = req.query;

    console.log(`📊 获取资金流向数据: ${code}, days=${days}`);

    // 从数据库获取数据
    const data = await fundFlowService.getFromDatabase(code, parseInt(days));

    if (data.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到数据，请先更新数据'
      });
    }

    res.json({
      success: true,
      data: {
        stockCode: code,
        stockName: data[0].stock_name,
        count: data.length,
        flows: data.map(row => ({
          date: row.trade_date,
          // 主力资金
          mainNet: parseFloat(row.main_net),
          mainNetRatio: parseFloat(row.main_net_ratio),
          mainInflow: parseFloat(row.main_inflow),
          mainOutflow: parseFloat(row.main_outflow),
          // 超大单
          superlargeNet: parseFloat(row.superlarge_net),
          // 大单
          largeNet: parseFloat(row.large_net),
          // 中单
          mediumNet: parseFloat(row.medium_net),
          // 小单
          smallNet: parseFloat(row.small_net),
          // 北向资金
          northboundNet: parseFloat(row.northbound_net)
        }))
      }
    });

  } catch (error) {
    console.error('获取资金流向数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/fund-flow/stock/:code/update
 * 更新股票资金流向数据
 */
router.post('/stock/:code/update', async (req, res) => {
  try {
    const { code } = req.params;
    const { days = 5 } = req.body;

    console.log(`🔄 更新资金流向数据: ${code}`);

    const data = await fundFlowService.updateStockFundFlow(code, days);

    res.json({
      success: true,
      message: `成功更新 ${data.length} 条数据`,
      data: {
        stockCode: code,
        count: data.length,
        latestDate: data[data.length - 1]?.tradeDate
      }
    });

  } catch (error) {
    console.error('更新资金流向数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/fund-flow/stock/:code/analyze
 * 分析资金流向模式
 *
 * Query Parameters:
 * - days: 分析天数，默认5
 */
router.get('/stock/:code/analyze', async (req, res) => {
  try {
    const { code } = req.params;
    const { days = 5 } = req.query;

    console.log(`🔍 分析资金流向模式: ${code}, days=${days}`);

    const analysis = await fundFlowService.analyzeFlowPattern(code, parseInt(days));

    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('分析资金流向模式失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/fund-flow/batch-update
 * 批量更新资金流向数据
 *
 * Body:
 * {
 *   "stocks": ["000001", "600000"],
 *   "days": 5
 * }
 */
router.post('/batch-update', async (req, res) => {
  try {
    const { stocks, days = 5 } = req.body;

    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码数组'
      });
    }

    console.log(`🔄 批量更新 ${stocks.length} 只股票的资金流向数据`);

    const results = await fundFlowService.batchUpdateFundFlow(stocks, days);

    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `批量更新完成: 成功${success}只，失败${failed}只`,
      data: results
    });

  } catch (error) {
    console.error('批量更新失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/fund-flow/summary
 * 获取资金流向汇总
 *
 * Query Parameters:
 * - date: 查询日期，默认今天
 */
router.get('/summary', async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split('T')[0];

    // 查询指定日期的资金流向汇总
    const pool = fundFlowService.pool;
    const query = `
      SELECT
        COUNT(*) as total_stocks,
        SUM(CASE WHEN main_net > 0 THEN 1 ELSE 0 END) as inflow_stocks,
        SUM(CASE WHEN main_net < 0 THEN 1 ELSE 0 END) as outflow_stocks,
        SUM(main_net) as total_main_net,
        AVG(main_net) as avg_main_net
      FROM fund_flow
      WHERE trade_date = $1
    `;

    const result = await pool.query(query, [queryDate]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '未找到指定日期的数据'
      });
    }

    const row = result.rows[0];

    // 查询流入和流出最多的股票
    const topInflowQuery = `
      SELECT stock_code, stock_name, main_net
      FROM fund_flow
      WHERE trade_date = $1 AND main_net > 0
      ORDER BY main_net DESC
      LIMIT 5
    `;

    const topOutflowQuery = `
      SELECT stock_code, stock_name, main_net
      FROM fund_flow
      WHERE trade_date = $1 AND main_net < 0
      ORDER BY main_net ASC
      LIMIT 5
    `;

    const [topInflow, topOutflow] = await Promise.all([
      pool.query(topInflowQuery, [queryDate]),
      pool.query(topOutflowQuery, [queryDate])
    ]);

    res.json({
      success: true,
      data: {
        date: queryDate,
        summary: {
          totalStocks: parseInt(row.total_stocks),
          inflowStocks: parseInt(row.inflow_stocks),
          outflowStocks: parseInt(row.outflow_stocks),
          totalMainNet: parseFloat(row.total_main_net || 0).toFixed(2),
          avgMainNet: parseFloat(row.avg_main_net || 0).toFixed(2)
        },
        topInflow: topInflow.rows.map(row => ({
          stockCode: row.stock_code,
          stockName: row.stock_name,
          mainNet: parseFloat(row.main_net).toFixed(2)
        })),
        topOutflow: topOutflow.rows.map(row => ({
          stockCode: row.stock_code,
          stockName: row.stock_name,
          mainNet: parseFloat(row.main_net).toFixed(2)
        }))
      }
    });

  } catch (error) {
    console.error('获取资金流向汇总失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/fund-flow/test
 * 测试接口
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Fund Flow API v2 is working!',
    endpoints: [
      'GET /api/v2/fund-flow/stock/:code - 获取资金流向数据',
      'POST /api/v2/fund-flow/stock/:code/update - 更新资金流向数据',
      'GET /api/v2/fund-flow/stock/:code/analyze - 分析资金流向模式',
      'POST /api/v2/fund-flow/batch-update - 批量更新',
      'GET /api/v2/fund-flow/summary - 获取资金流向汇总'
    ]
  });
});

module.exports = router;
