const express = require('express');
const router = express.Router();
const aiLearningService = require('./ai-learning-service');
const scheduler = require('./scheduler');

/**
 * AI学习API路由
 */

// 获取今日学习摘要
router.get('/summary', async (req, res) => {
  try {
    const summary = await aiLearningService.getTodaySummary();

    if (!summary) {
      return res.json({
        success: true,
        data: {
          message: '今日暂无学习记录',
          log_date: new Date().toISOString().split('T')[0],
        },
      });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (e) {
    console.error('[API] 获取学习摘要失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 获取学习统计
router.get('/stats', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const stats = await aiLearningService.getLearningStats(days);

    res.json({
      success: true,
      data: {
        days,
        stats,
      },
    });
  } catch (e) {
    console.error('[API] 获取学习统计失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 手动触发新闻学习
router.post('/learn-news', async (req, res) => {
  try {
    console.log('[API] 手动触发新闻学习');
    const result = await scheduler.triggerNewsLearning();

    res.json({
      success: true,
      message: '新闻学习完成',
      data: result,
    });
  } catch (e) {
    console.error('[API] 新闻学习失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 手动触发关联分析
router.post('/analyze', async (req, res) => {
  try {
    const { date } = req.body;
    const analyzeDate = date || new Date().toISOString().split('T')[0];

    console.log('[API] 手动触发关联分析，日期:', analyzeDate);
    const result = await scheduler.triggerCorrelationAnalysis(analyzeDate);

    res.json({
      success: true,
      message: '关联分析完成',
      data: result,
    });
  } catch (e) {
    console.error('[API] 关联分析失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 获取指定日期的事件
router.get('/events/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const events = await aiLearningService.getEventsByDate(date);

    res.json({
      success: true,
      data: {
        date,
        events,
        count: events.length,
      },
    });
  } catch (e) {
    console.error('[API] 获取事件失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 获取指定日期的市场数据
router.get('/market/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const marketData = await aiLearningService.getMarketDataByDate(date);

    if (!marketData) {
      return res.json({
        success: true,
        data: null,
        message: '未找到该日期的市场数据',
      });
    }

    res.json({
      success: true,
      data: marketData,
    });
  } catch (e) {
    console.error('[API] 获取市场数据失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 获取新闻-市场关联数据
router.get('/correlations/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const client = aiLearningService.pool;

    const query = `
      SELECT
        nmc.*,
        em.event_title,
        em.event_type,
        em.importance,
        mm.trade_date,
        mm.market_mood
      FROM news_market_correlation nmc
      JOIN event_memory em ON nmc.event_id = em.id
      JOIN market_memory mm ON nmc.market_id = mm.id
      WHERE mm.trade_date = $1
      ORDER BY nmc.correlation_score DESC
    `;

    const result = await client.query(query, [date]);

    res.json({
      success: true,
      data: {
        date,
        correlations: result.rows,
        count: result.rows.length,
      },
    });
  } catch (e) {
    console.error('[API] 获取关联数据失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 记录市场数据（手动）
router.post('/market', async (req, res) => {
  try {
    const marketData = req.body;

    // 验证必需字段
    if (!marketData.trade_date) {
      return res.status(400).json({
        success: false,
        error: '缺少必需字段: trade_date',
      });
    }

    console.log('[API] 手动记录市场数据');
    const result = await scheduler.triggerMarketRecording(marketData);

    res.json({
      success: true,
      message: '市场数据记录成功',
      data: result,
    });
  } catch (e) {
    console.error('[API] 记录市场数据失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 启动调度器
router.post('/scheduler/start', async (req, res) => {
  try {
    scheduler.start();

    res.json({
      success: true,
      message: '调度器已启动',
    });
  } catch (e) {
    console.error('[API] 启动调度器失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 停止调度器
router.post('/scheduler/stop', async (req, res) => {
  try {
    scheduler.stop();

    res.json({
      success: true,
      message: '调度器已停止',
    });
  } catch (e) {
    console.error('[API] 停止调度器失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

// 获取调度器状态
router.get('/scheduler/status', async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        isRunning: scheduler.isRunning,
        tasks: Array.from(scheduler.tasks.keys()),
      },
    });
  } catch (e) {
    console.error('[API] 获取调度器状态失败:', e);
    res.status(500).json({
      success: false,
      error: e.message,
    });
  }
});

module.exports = router;
