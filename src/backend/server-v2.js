/**
 * v2 API Server
 * 独立的v2 API服务器，提供决策、回测、监控功能
 */

require('dotenv').config();
const http = require('http');
const url = require('url');

// v2 Services
const DecisionEngine = require('./services/decision/decision-engine');
const BacktestEngine = require('./services/backtest/backtest-engine');
const PriceDataService = require('./services/data/price-data-service');
const DataExportService = require('./services/export/data-export-service');
const TutorialService = require('./services/tutorial/tutorial-service');
const WatchlistService = require('./services/watchlist/watchlist-service');
const MonitoringService = require('./services/monitoring/monitoring-service');
const CacheService = require('./services/cache/cache-service');
const WebSocketService = require('./services/websocket/websocket-service');
const FundamentalAnalysisService = require('./services/fundamental/fundamental-analysis-service');
const EnhancedTechnicalIndicatorsService = require('./services/technical/enhanced-indicators-service');

const PORT = 3002; // 使用不同的端口避免冲突

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  // Logging
  console.log(`[v2 API] ${req.method} ${parsedUrl.pathname}`);

  // ==================== v2 API Routes ====================

  // /health - 健康检查
  if (parsedUrl.pathname === '/health' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      success: true,
      version: '2.0.0',
      status: 'healthy',
      features: {
        decision: true,
        backtest: true,
        monitoring: true,
        batchDecision: true
      }
    }));
    return;
  }

  // /api/v2/health - v2健康检查
  if (parsedUrl.pathname === '/api/v2/health' && req.method === 'GET') {
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({
      success: true,
      version: '2.0.0',
      status: 'healthy'
    }));
    return;
  }

  // /api/v2/monitoring/status - 获取监控状态
  if (parsedUrl.pathname === '/api/v2/monitoring/status' && req.method === 'GET') {
    const monitoringService = new MonitoringService();
    monitoringService.getMonitoringStatus()
      .then(status => {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: status
        }));
      })
      .catch(error => {
        console.error('[监控API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/monitoring/report - 生成监控报告
  if (parsedUrl.pathname.startsWith('/api/v2/monitoring/report') && req.method === 'GET') {
    const urlParams = new URLSearchParams(reqUrl.query);
    const period = urlParams.get('period') || 'daily';

    const monitoringService = new MonitoringService();
    monitoringService.generateMonitoringReport(period)
      .then(report => {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: report
        }));
      })
      .catch(error => {
        console.error('[监控报告API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/decision/generate - 生成投资决策
  if (parsedUrl.pathname === '/api/v2/decision/generate' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { stockCode } = JSON.parse(body);

        if (!stockCode) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({success: false, error: '股票代码不能为空'}));
        }

        const decisionEngine = new DecisionEngine();
        const decision = await decisionEngine.generateDecision(stockCode);

        // 实时推送决策更新
        WebSocketService.pushDecisionUpdate(stockCode, decision);

        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: decision
        }));
      } catch (error) {
        console.error('[决策API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  // /api/v2/decision/batch - 批量生成投资决策
  if (parsedUrl.pathname === '/api/v2/decision/batch' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { stockCodes } = JSON.parse(body);

        if (!stockCodes || !Array.isArray(stockCodes) || stockCodes.length === 0) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({success: false, error: '股票代码数组不能为空'}));
        }

        if (stockCodes.length > 20) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({success: false, error: '单次最多支持20只股票'}));
        }

        const decisionEngine = new DecisionEngine();
        const results = [];
        const errors = [];

        for (let i = 0; i < stockCodes.length; i++) {
          const stockCode = stockCodes[i];
          try {
            const decision = await decisionEngine.generateDecision(stockCode);
            results.push(decision);
          } catch (error) {
            errors.push({ stockCode, error: error.message });
          }
        }

        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: {
            total: stockCodes.length,
            success: results.length,
            failed: errors.length,
            results: results,
            errors: errors
          }
        }));
      } catch (error) {
        console.error('[批量决策API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  // /api/v2/chart/data - 获取图表数据
  if (parsedUrl.pathname === '/api/v2/chart/data' && req.method === 'GET') {
    const stockCode = url.parse(req.url, true).query.stockCode;
    const days = parseInt(url.parse(req.url, true).query.days) || 60;

    if (!stockCode) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: '缺少stockCode参数' }));
      return;
    }

    const priceDataService = new PriceDataService();
    priceDataService.getChartData(stockCode, days)
      .then(chartData => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: chartData
        }));
      })
      .catch(error => {
        console.error('[图表数据API] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/fundamental/analyze - 基本面分析 [NEW]
  if (parsedUrl.pathname === '/api/v2/fundamental/analyze' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;
    if (!stockCode) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({
        success: false,
        error: '缺少stockCode参数'
      }));
    }

    const fundamentalService = new FundamentalAnalysisService();
    fundamentalService.getFundamentalAnalysis(stockCode)
      .then(result => {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify(result));
      })
      .catch(error => {
        console.error('[基本面分析API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/indicators/enhanced - 增强技术指标 [NEW]
  if (parsedUrl.pathname === '/api/v2/indicators/enhanced' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;
    const days = parseInt(parsedUrl.query.days) || 60;

    if (!stockCode) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({
        success: false,
        error: '缺少stockCode参数'
      }));
    }

    const indicatorsService = new EnhancedTechnicalIndicatorsService();
    indicatorsService.getEnhancedIndicators(stockCode, days)
      .then(result => {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify(result));
      })
      .catch(error => {
        console.error('[增强技术指标API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/backtest/create - 创建回测
  if (parsedUrl.pathname === '/api/v2/backtest/create' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const config = JSON.parse(body);
        const { stockCode, startDate, endDate, strategy } = config;

        if (!stockCode || !startDate || !endDate) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({
            success: false,
            error: '缺少必要参数: stockCode, startDate, endDate'
          }));
        }

        const backtestEngine = new BacktestEngine();
        const backtest = await backtestEngine.runBacktest(
          stockCode,
          startDate,
          endDate,
          strategy || {
            buyThreshold: 70,
            sellThreshold: 30,
            stopLoss: 0.08,
            takeProfit: 0.15
          }
        );

        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: backtest
        }));
      } catch (error) {
        console.error('[回测API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  // /api/v2/decision/history - 获取决策历史
  if (parsedUrl.pathname === '/api/v2/decision/history' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;
    const limit = parseInt(parsedUrl.query.limit) || 50;

    const decisionEngine = new DecisionEngine();
    decisionEngine.getDecisionHistory(stockCode, limit)
      .then(history => {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: {
            stockCode: stockCode,
            count: history.length,
            decisions: history
          }
        }));
      })
      .catch(error => {
        console.error('[决策历史API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/export/decision/csv - 导出决策为CSV
  if (parsedUrl.pathname === '/api/v2/export/decision/csv' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;
    const limit = parseInt(parsedUrl.query.limit) || 50;

    if (!stockCode) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: '缺少stockCode参数' }));
      return;
    }

    const exportService = new DataExportService();
    exportService.exportDecisionToCSV(stockCode, limit)
      .then(result => {
        res.writeHead(200, {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${result.filename}"`
        });
        res.end(result.content);
      })
      .catch(error => {
        console.error('[导出CSV] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      });
    return;
  }

  // /api/v2/export/decision/json - 导出决策为JSON
  if (parsedUrl.pathname === '/api/v2/export/decision/json' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;
    const limit = parseInt(parsedUrl.query.limit) || 50;

    if (!stockCode) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: '缺少stockCode参数' }));
      return;
    }

    const exportService = new DataExportService();
    exportService.exportDecisionToJSON(stockCode, limit)
      .then(result => {
        res.writeHead(200, {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="${result.filename}"`
        });
        res.end(result.content);
      })
      .catch(error => {
        console.error('[导出JSON] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      });
    return;
  }

  // /api/v2/export/report - 生成分析报告
  if (parsedUrl.pathname === '/api/v2/export/report' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;

    if (!stockCode) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: '缺少stockCode参数' }));
      return;
    }

    const exportService = new DataExportService();
    exportService.generateReport(stockCode)
      .then(result => {
        res.writeHead(200, {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Disposition': `attachment; filename="${result.filename}"`
        });
        res.end(result.content);
      })
      .catch(error => {
        console.error('[生成报告] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      });
    return;
  }

  // /api/v2/tutorial/topics - 获取所有教程主题
  if (parsedUrl.pathname === '/api/v2/tutorial/topics' && req.method === 'GET') {
    const tutorialService = new TutorialService();
    const topics = tutorialService.getAllTopics();
    const tutorials = {};
    topics.forEach(topic => {
      tutorials[topic] = {
        title: tutorialService.getTutorial(topic).title
      };
    });

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: {
        topics: tutorials,
        count: topics.length
      }
    }));
    return;
  }

  // /api/v2/tutorial/beginner-flow - 获取新手引导流程
  if (parsedUrl.pathname === '/api/v2/tutorial/beginner-flow' && req.method === 'GET') {
    const tutorialService = new TutorialService();
    const flow = tutorialService.getBeginnerFlow();

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: flow
    }));
    return;
  }

  // /api/v2/tutorial/glossary - 获取术语表
  if (parsedUrl.pathname === '/api/v2/tutorial/glossary' && req.method === 'GET') {
    const tutorialService = new TutorialService();
    const glossary = tutorialService.getGlossary();

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: glossary
    }));
    return;
  }

  // /api/v2/tutorial/:topic - 获取具体教程内容
  if (parsedUrl.pathname.startsWith('/api/v2/tutorial/') && req.method === 'GET') {
    const topic = parsedUrl.pathname.split('/').pop();
    const tutorialService = new TutorialService();
    const tutorial = tutorialService.getTutorial(topic);

    if (!tutorial) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: '教程不存在' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      success: true,
      data: {
        topic: topic,
        title: tutorial.title,
        content: tutorial.content
      }
    }));
    return;
  }

  // /api/v2/watchlist/add - 添加到自选股
  if (parsedUrl.pathname === '/api/v2/watchlist/add' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { userId, stockCode, stockName } = JSON.parse(body);

        if (!stockCode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '缺少stockCode参数' }));
          return;
        }

        const watchlistService = new WatchlistService();
        const result = await watchlistService.addToWatchlist(userId, stockCode, stockName);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('[添加自选股] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // /api/v2/watchlist/remove - 从自选中移除
  if (parsedUrl.pathname === '/api/v2/watchlist/remove' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { userId, stockCode } = JSON.parse(body);

        if (!stockCode) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: '缺少stockCode参数' }));
          return;
        }

        const watchlistService = new WatchlistService();
        const result = await watchlistService.removeFromWatchlist(userId, stockCode);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('[移除自选股] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }

  // /api/v2/watchlist/list - 获取自选股列表
  if (parsedUrl.pathname === '/api/v2/watchlist/list' && req.method === 'GET') {
    const userId = parsedUrl.query.userId || 'default';

    const watchlistService = new WatchlistService();
    watchlistService.getWatchlist(userId)
      .then(result => {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(result));
      })
      .catch(error => {
        console.error('[获取自选股] 错误:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      });
    return;
  }

  // /api/v2/decision/latest - 获取最新决策
  if (parsedUrl.pathname === '/api/v2/decision/latest' && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;

    if (!stockCode) {
      res.writeHead(400, {'Content-Type': 'application/json'});
      return res.end(JSON.stringify({
        success: false,
        error: '股票代码不能为空'
      }));
    }

    const decisionEngine = new DecisionEngine();
    decisionEngine.getLatestDecision(stockCode)
      .then(latest => {
        if (!latest) {
          res.writeHead(200, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({
            success: true,
            data: null,
            message: '未找到决策记录'
          }));
        }

        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: latest
        }));
      })
      .catch(error => {
        console.error('[最新决策API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/decision/stats - 决策统计
  if (parsedUrl.pathname.startsWith('/api/v2/decision/stats') && req.method === 'GET') {
    const stockCode = parsedUrl.query.stockCode;
    const days = parseInt(parsedUrl.query.days) || 30;

    const decisionEngine = new DecisionEngine();
    decisionEngine.getDecisionStats(stockCode, days)
      .then(stats => {
        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: stats
        }));
      })
      .catch(error => {
        console.error('[决策统计API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      });
    return;
  }

  // /api/v2/cache/stats - 获取缓存统计
  if (parsedUrl.pathname === '/api/v2/cache/stats' && req.method === 'GET') {
    try {
      const stats = CacheService.getStats();
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({
        success: true,
        data: stats
      }));
    } catch (error) {
      console.error('[缓存统计API] 错误:', error);
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }

  // /api/v2/cache/clear - 清空所有缓存
  if (parsedUrl.pathname === '/api/v2/cache/clear' && req.method === 'POST') {
    try {
      CacheService.clear();
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({
        success: true,
        message: '所有缓存已清空'
      }));
    } catch (error) {
      console.error('[清空缓存API] 错误:', error);
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }

  // /api/v2/cache/stock/:stockCode - 清除指定股票的缓存
  if (parsedUrl.pathname.startsWith('/api/v2/cache/stock/') && req.method === 'DELETE') {
    try {
      const stockCode = parsedUrl.pathname.split('/').pop();
      CacheService.clearStockCache(stockCode);
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({
        success: true,
        message: `已清除股票 ${stockCode} 的缓存`
      }));
    } catch (error) {
      console.error('[清除股票缓存API] 错误:', error);
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }

  // /api/v2/websocket/stats - 获取WebSocket连接统计
  if (parsedUrl.pathname === '/api/v2/websocket/stats' && req.method === 'GET') {
    try {
      const stats = WebSocketService.getStats();
      res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
      res.end(JSON.stringify({
        success: true,
        data: stats
      }));
    } catch (error) {
      console.error('[WebSocket统计API] 错误:', error);
      res.writeHead(500, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        success: false,
        error: error.message
      }));
    }
    return;
  }

  // /api/v2/websocket/broadcast - 广播消息给所有客户端
  if (parsedUrl.pathname === '/api/v2/websocket/broadcast' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { topic, message } = JSON.parse(body);

        if (!topic || !message) {
          res.writeHead(400, {'Content-Type': 'application/json'});
          return res.end(JSON.stringify({
            success: false,
            error: '缺少必要参数: topic, message'
          }));
        }

        const sentCount = WebSocketService.broadcast(topic, message);

        res.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        res.end(JSON.stringify({
          success: true,
          data: {
            topic: topic,
            sentCount: sentCount
          }
        }));
      } catch (error) {
        console.error('[WebSocket广播API] 错误:', error);
        res.writeHead(500, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          success: false,
          error: error.message
        }));
      }
    });
    return;
  }

  // 404 - Not Found
  res.writeHead(404, {'Content-Type': 'application/json'});
  res.end(JSON.stringify({
    success: false,
    error: 'API endpoint not found',
    path: parsedUrl.pathname
  }));
});

// 初始化WebSocket服务
WebSocketService.initialize(server);

// 启动心跳检测
WebSocketService.startHeartbeat();

server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║         🚀 AI Investment Decision API v2.2           ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log(`║  Status: Running                                       ║`);
  console.log(`║  Port: ${PORT}                                              ║`);
  console.log(`║  URL: http://localhost:${PORT}                         ║`);
  console.log(`║  WebSocket: ws://localhost:${PORT}                      ║`);
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  Available Endpoints:                                  ║');
  console.log('║  • GET  /health                                       ║');
  console.log('║  • GET  /api/v2/health                                ║');
  console.log('║  • GET  /api/v2/monitoring/status                     ║');
  console.log('║  • POST /api/v2/decision/generate                     ║');
  console.log('║  • POST /api/v2/decision/batch                         ║');
  console.log('║  • GET  /api/v2/decision/history                      ║');
  console.log('║  • GET  /api/v2/decision/latest                       ║');
  console.log('║  • GET  /api/v2/decision/stats                        ║');
  console.log('║  • GET  /api/v2/cache/stats                           ║');
  console.log('║  • POST /api/v2/cache/clear                            ║');
  console.log('║  • DELETE /api/v2/cache/stock/:code                   ║');
  console.log('║  • GET  /api/v2/websocket/stats                        ║');
  console.log('║  • POST /api/v2/websocket/broadcast                    ║');
  console.log('║  • POST /api/v2/backtest/create                        ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  📊 专业分析 [NEW]:                                     ║');
  console.log('║  • GET  /api/v2/fundamental/analyze                     ║');
  console.log('║  • GET  /api/v2/indicators/enhanced                     ║');
  console.log('║  • GET  /api/v2/chart/data                              ║');
  console.log('║  • GET  /api/v2/export/decision/csv                     ║');
  console.log('║  • GET  /api/v2/export/decision/json                    ║');
  console.log('║  • GET  /api/v2/export/report                           ║');
  console.log('╠════════════════════════════════════════════════════════╣');
  console.log('║  📚 教程与自选:                                         ║');
  console.log('║  • GET  /api/v2/tutorial/topics                         ║');
  console.log('║  • GET  /api/v2/tutorial/:topic                         ║');
  console.log('║  • GET  /api/v2/tutorial/beginner-flow                 ║');
  console.log('║  • GET  /api/v2/tutorial/glossary                       ║');
  console.log('║  • POST /api/v2/watchlist/add                           ║');
  console.log('║  • POST /api/v2/watchlist/remove                        ║');
  console.log('║  • GET  /api/v2/watchlist/list                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  console.log('║  🌐 WebSocket Events:                                   ║');
  console.log('║  • decision:{stockCode}  - 决策更新推送               ║');
  console.log('║  • market:{stockCode}     - 行情更新推送               ║');
  console.log('║  • alerts                 - 监控告警推送               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
});

module.exports = server;
