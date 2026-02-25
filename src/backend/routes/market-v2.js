/**
 * Market Data API Routes v2
 * 市场数据API路由
 *
 * 提供行情数据查询和更新接口
 */

const express = require('express');
const router = express.Router();
const EnhancedMarketService = require('../services/market-data/enhanced-market-service');

const marketService = new EnhancedMarketService();

/**
 * GET /api/v2/market/stock/:code/kline
 * 获取股票K线数据
 *
 * Query Parameters:
 * - limit: 返回条数，默认200
 * - period: 周期，daily(默认)/weekly/monthly
 */
router.get('/stock/:code/kline', async (req, res) => {
  try {
    const { code } = req.params;
    const { limit = 200 } = req.query;

    console.log(`📊 获取K线数据: ${code}, limit=${limit}`);

    // 从数据库获取数据
    const data = await marketService.getFromDatabase(code, parseInt(limit));

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
        klines: data.map(row => ({
          date: row.trade_date,
          open: parseFloat(row.open_price),
          close: parseFloat(row.close_price),
          high: parseFloat(row.high_price),
          low: parseFloat(row.low_price),
          volume: parseInt(row.volume),
          amount: parseFloat(row.amount),
          indicators: {
            ma: {
              ma5: row.ma5 ? parseFloat(row.ma5) : null,
              ma10: row.ma10 ? parseFloat(row.ma10) : null,
              ma20: row.ma20 ? parseFloat(row.ma20) : null,
              ma60: row.ma60 ? parseFloat(row.ma60) : null
            },
            macd: {
              macd: row.macd ? parseFloat(row.macd) : null,
              signal: row.macd_signal ? parseFloat(row.macd_signal) : null,
              hist: row.macd_hist ? parseFloat(row.macd_hist) : null
            },
            rsi: {
              rsi6: row.rsi6 ? parseFloat(row.rsi6) : null,
              rsi12: row.rsi12 ? parseFloat(row.rsi12) : null,
              rsi24: row.rsi24 ? parseFloat(row.rsi24) : null
            },
            kdj: {
              k: row.kdj_k ? parseFloat(row.kdj_k) : null,
              d: row.kdj_d ? parseFloat(row.kdj_d) : null,
              j: row.kdj_j ? parseFloat(row.kdj_j) : null
            },
            boll: {
              upper: row.boll_upper ? parseFloat(row.boll_upper) : null,
              mid: row.boll_mid ? parseFloat(row.boll_mid) : null,
              lower: row.boll_lower ? parseFloat(row.boll_lower) : null
            }
          }
        }))
      }
    });

  } catch (error) {
    console.error('获取K线数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/market/stock/:code/update
 * 更新股票数据
 */
router.post('/stock/:code/update', async (req, res) => {
  try {
    const { code } = req.params;

    console.log(`🔄 更新股票数据: ${code}`);

    const data = await marketService.updateStockData(code);

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
    console.error('更新股票数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/market/stock/:code/realtime
 * 获取实时数据
 */
router.get('/stock/:code/realtime', async (req, res) => {
  try {
    const { code } = req.params;

    const data = await marketService.getRealtimeData(code);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: '未找到数据'
      });
    }

    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('获取实时数据失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/market/batch-update
 * 批量更新股票数据
 *
 * Body:
 * {
 *   "stocks": ["000001.SZ", "600000.SH"]
 * }
 */
router.post('/batch-update', async (req, res) => {
  try {
    const { stocks } = req.body;

    if (!stocks || !Array.isArray(stocks)) {
      return res.status(400).json({
        success: false,
        error: '请提供股票代码数组'
      });
    }

    console.log(`🔄 批量更新 ${stocks.length} 只股票数据`);

    const results = await marketService.batchUpdateStockData(stocks);

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
 * GET /api/v2/market/test
 * 测试接口
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Market Data API v2 is working!',
    endpoints: [
      'GET /api/v2/market/stock/:code/kline - 获取K线数据',
      'POST /api/v2/market/stock/:code/update - 更新股票数据',
      'GET /api/v2/market/stock/:code/realtime - 获取实时数据',
      'POST /api/v2/market/batch-update - 批量更新'
    ]
  });
});

module.exports = router;
