/**
 * AI学习功能API路由处理
 * 这些函数将被添加到simple-server.js中
 */

const aiLearningService = require('./ai-learning-service');
const scheduler = require('./scheduler');

/**
 * AI学习相关的路由处理
 */
const aiLearningRoutes = {
  // 获取今日学习摘要
  '/api/v1/ai-learning/summary': async (req, res) => {
    try {
      const summary = await aiLearningService.getTodaySummary();

      if (!summary) {
        return sendJSON(res, {
          success: true,
          data: {
            message: '今日暂无学习记录',
            log_date: new Date().toISOString().split('T')[0],
          },
        });
      }

      sendJSON(res, {
        success: true,
        data: summary,
      });
    } catch (e) {
      console.error('[API] 获取学习摘要失败:', e);
      sendError(res, 500, '获取学习摘要失败: ' + e.message);
    }
  },

  // 获取学习统计
  '/api/v1/ai-learning/stats': async (req, res) => {
    try {
      const url = require('url').parse(req.url, true);
      const days = parseInt(url.query.days) || 30;
      const stats = await aiLearningService.getLearningStats(days);

      sendJSON(res, {
        success: true,
        data: {
          days,
          stats,
        },
      });
    } catch (e) {
      console.error('[API] 获取学习统计失败:', e);
      sendError(res, 500, '获取学习统计失败: ' + e.message);
    }
  },

  // 手动触发新闻学习
  '/api/v1/ai-learning/learn-news': async (req, res) => {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          console.log('[API] 手动触发新闻学习');
          const result = await scheduler.triggerNewsLearning();

          sendJSON(res, {
            success: true,
            message: '新闻学习完成',
            data: result,
          });
        } catch (e) {
          console.error('[API] 新闻学习失败:', e);
          sendError(res, 500, '新闻学习失败: ' + e.message);
        }
      });
    } catch (e) {
      console.error('[API] 请求处理失败:', e);
      sendError(res, 500, '请求处理失败: ' + e.message);
    }
  },

  // 手动触发关联分析
  '/api/v1/ai-learning/analyze': async (req, res) => {
    try {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const data = JSON.parse(body || '{}');
          const analyzeDate = data.date || new Date().toISOString().split('T')[0];

          console.log('[API] 手动触发关联分析，日期:', analyzeDate);
          const result = await scheduler.triggerCorrelationAnalysis(analyzeDate);

          sendJSON(res, {
            success: true,
            message: '关联分析完成',
            data: result,
          });
        } catch (e) {
          console.error('[API] 关联分析失败:', e);
          sendError(res, 500, '关联分析失败: ' + e.message);
        }
      });
    } catch (e) {
      console.error('[API] 请求处理失败:', e);
      sendError(res, 500, '请求处理失败: ' + e.message);
    }
  },

  // 获取指定日期的事件
  '/api/v1/ai-learning/events': async (req, res) => {
    try {
      const url = require('url').parse(req.url, true);
      const date = url.query.date || new Date().toISOString().split('T')[0];

      const events = await aiLearningService.getEventsByDate(date);

      sendJSON(res, {
        success: true,
        data: {
          date,
          events,
          count: events.length,
        },
      });
    } catch (e) {
      console.error('[API] 获取事件失败:', e);
      sendError(res, 500, '获取事件失败: ' + e.message);
    }
  },

  // 获取指定日期的市场数据
  '/api/v1/ai-learning/market': async (req, res) => {
    try {
      const url = require('url').parse(req.url, true);
      const date = url.query.date || new Date().toISOString().split('T')[0];

      const marketData = await aiLearningService.getMarketDataByDate(date);

      if (!marketData) {
        return sendJSON(res, {
          success: true,
          data: null,
          message: '未找到该日期的市场数据',
        });
      }

      sendJSON(res, {
        success: true,
        data: marketData,
      });
    } catch (e) {
      console.error('[API] 获取市场数据失败:', e);
      sendError(res, 500, '获取市场数据失败: ' + e.message);
    }
  },

  // 记录市场数据（手动）
  '/api/v1/ai-learning/market': async (req, res) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method Not Allowed');
    }

    try {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const marketData = JSON.parse(body || '{}');

          // 验证必需字段
          if (!marketData.trade_date) {
            return sendError(res, 400, '缺少必需字段: trade_date');
          }

          console.log('[API] 手动记录市场数据');
          const result = await scheduler.triggerMarketRecording(marketData);

          sendJSON(res, {
            success: true,
            message: '市场数据记录成功',
            data: result,
          });
        } catch (e) {
          console.error('[API] 记录市场数据失败:', e);
          sendError(res, 500, '记录市场数据失败: ' + e.message);
        }
      });
    } catch (e) {
      console.error('[API] 请求处理失败:', e);
      sendError(res, 500, '请求处理失败: ' + e.message);
    }
  },

  // 启动调度器
  '/api/v1/ai-learning/scheduler/start': async (req, res) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method Not Allowed');
    }

    try {
      scheduler.start();

      sendJSON(res, {
        success: true,
        message: '调度器已启动',
      });
    } catch (e) {
      console.error('[API] 启动调度器失败:', e);
      sendError(res, 500, '启动调度器失败: ' + e.message);
    }
  },

  // 停止调度器
  '/api/v1/ai-learning/scheduler/stop': async (req, res) => {
    if (req.method !== 'POST') {
      return sendError(res, 405, 'Method Not Allowed');
    }

    try {
      scheduler.stop();

      sendJSON(res, {
        success: true,
        message: '调度器已停止',
      });
    } catch (e) {
      console.error('[API] 停止调度器失败:', e);
      sendError(res, 500, '停止调度器失败: ' + e.message);
    }
  },

  // 获取调度器状态
  '/api/v1/ai-learning/scheduler/status': async (req, res) => {
    try {
      sendJSON(res, {
        success: true,
        data: {
          isRunning: scheduler.isRunning,
          tasks: Array.from(scheduler.tasks.keys()),
        },
      });
    } catch (e) {
      console.error('[API] 获取调度器状态失败:', e);
      sendError(res, 500, '获取调度器状态失败: ' + e.message);
    }
  },
};

// 辅助函数
function sendJSON(res, data) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

function sendError(res, statusCode, message) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({
    success: false,
    error: message,
  }));
}

module.exports = aiLearningRoutes;
