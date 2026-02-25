/**
 * News Events API Routes v2
 * 新闻事件API路由
 *
 * 提供新闻事件提取、查询和分析接口
 */

const express = require('express');
const router = express.Router();
const EventExtractor = require('../services/news-analysis/event-extractor');
const SentimentAnalyzer = require('../services/news-analysis/sentiment-analyzer');
const SectorMapper = require('../services/news-analysis/sector-mapper');

const eventExtractor = new EventExtractor();
const sentimentAnalyzer = new SentimentAnalyzer();
const sectorMapper = new SectorMapper();

/**
 * POST /api/v2/news/extract
 * 从新闻中提取事件
 *
 * Body:
 * {
 *   "id": 1,
 *   "title": "新闻标题",
 *   "content": "新闻内容",
 *   "source": "来源",
 *   "publishTime": "发布时间"
 * }
 */
router.post('/extract', async (req, res) => {
  try {
    const newsItem = req.body;

    if (!newsItem || !newsItem.title) {
      return res.status(400).json({
        success: false,
        error: '请提供新闻标题'
      });
    }

    console.log(`📰 提取事件: ${newsItem.title}`);

    // 提取事件
    const event = await eventExtractor.extract(newsItem);

    // 保存到数据库
    const eventId = await eventExtractor.saveToDatabase(event);

    res.json({
      success: true,
      data: {
        eventId: eventId,
        event: event
      },
      message: '事件提取成功'
    });

  } catch (error) {
    console.error('提取事件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/news/batch-extract
 * 批量提取事件
 *
 * Body:
 * {
 *   "news": [{...}, {...}]
 * }
 */
router.post('/batch-extract', async (req, res) => {
  try {
    const { news } = req.body;

    if (!news || !Array.isArray(news)) {
      return res.status(400).json({
        success: false,
        error: '请提供新闻数组'
      });
    }

    console.log(`📰 批量提取事件: ${news.length}条`);

    const results = await eventExtractor.batchExtract(news);

    const success = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `批量提取完成: 成功${success}条，失败${failed}条`,
      data: results
    });

  } catch (error) {
    console.error('批量提取失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/news/events/:newsId
 * 获取新闻的事件
 */
router.get('/events/:newsId', async (req, res) => {
  try {
    const { newsId } = req.params;

    const event = await eventExtractor.getFromDatabase(parseInt(newsId));

    if (!event) {
      return res.status(404).json({
        success: false,
        error: '未找到事件'
      });
    }

    res.json({
      success: true,
      data: event
    });

  } catch (error) {
    console.error('获取事件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/news/events/recent
 * 获取最近的重要事件
 *
 * Query Parameters:
 * - limit: 返回数量，默认20
 * - minImportance: 最小重要性，默认5
 */
router.get('/events/recent', async (req, res) => {
  try {
    const { limit = 20, minImportance = 5 } = req.query;

    const events = await eventExtractor.getRecentEvents(
      parseInt(limit),
      parseInt(minImportance)
    );

    res.json({
      success: true,
      data: {
        count: events.length,
        events: events.map(event => ({
          id: event.id,
          title: event.title,
          eventType: event.event_type,
          importanceScore: parseFloat(event.importance_score),
          sentiment: event.sentiment,
          sentimentScore: parseFloat(event.sentiment_score),
          impactSectors: event.impact_sectors,
          impactStocks: event.impact_stocks,
          confidence: parseFloat(event.confidence),
          createdAt: event.created_at
        }))
      }
    });

  } catch (error) {
    console.error('获取最近事件失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/news/analyze/sentiment
 * 分析文本情感
 *
 * Body:
 * {
 *   "text": "要分析的文本"
 * }
 */
router.post('/analyze/sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: '请提供要分析的文本'
      });
    }

    const result = await sentimentAnalyzer.analyze(text);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('情感分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/news/analyze/sectors
 * 分析事件影响的板块
 *
 * Body:
 * {
 *   "title": "事件标题",
 *   "description": "事件描述"
 * }
 */
router.post('/analyze/sectors', async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: '请提供事件标题'
      });
    }

    const event = {
      title: title,
      description: description || ''
    };

    const sectors = await sectorMapper.mapEventToSectors(event);

    res.json({
      success: true,
      data: {
        sectors: sectors,
        count: sectors.length
      }
    });

  } catch (error) {
    console.error('板块分析失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/news/recommend/stocks
 * 推荐受事件影响的股票
 *
 * Body:
 * {
 *   "title": "事件标题",
 *   "description": "事件描述",
 *   "limit": 10
 * }
 */
router.post('/recommend/stocks', async (req, res) => {
  try {
    const { title, description, limit = 10 } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: '请提供事件标题'
      });
    }

    const event = {
      title: title,
      description: description || ''
    };

    const recommendation = await sectorMapper.recommendStocks(event, parseInt(limit));

    res.json({
      success: true,
      data: recommendation
    });

  } catch (error) {
    console.error('股票推荐失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/news/sectors
 * 获取所有板块列表
 */
router.get('/sectors', (req, res) => {
  const sectors = sectorMapper.getAllSectors();

  res.json({
    success: true,
    data: {
      count: sectors.length,
      sectors: sectors
    }
  });
});

/**
 * GET /api/v2/news/test
 * 测试接口
 */
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'News Events API v2 is working!',
    endpoints: [
      'POST /api/v2/news/extract - 提取事件',
      'POST /api/v2/news/batch-extract - 批量提取',
      'GET /api/v2/news/events/:newsId - 获取事件',
      'GET /api/v2/news/events/recent - 最近事件',
      'POST /api/v2/news/analyze/sentiment - 情感分析',
      'POST /api/v2/news/analyze/sectors - 板块分析',
      'POST /api/v2/news/recommend/stocks - 股票推荐',
      'GET /api/v2/news/sectors - 板块列表'
    ]
  });
});

module.exports = router;
