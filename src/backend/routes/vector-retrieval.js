/**
 * Vector Retrieval API Routes
 * 向量检索API路由
 *
 * 提供向量存储和相似事件检索接口
 */

const express = require('express');
const router = express.Router();
const VectorStoreService = require('../services/vector/vector-store-service');
const SimilarEventRetriever = require('../services/similarity/similar-event-retriever');

const vectorStore = new VectorStoreService();
const retriever = new SimilarEventRetriever();

// 初始化
let initialized = false;
async function ensureInitialized() {
  if (!initialized) {
    await vectorStore.initialize();
    await retriever.initialize();
    initialized = true;
  }
}

/**
 * POST /api/v2/vector/index-event
 * 向量化并存储单个事件
 *
 * Body:
 * {
 *   "id": 1,
 *   "title": "事件标题",
 *   "description": "事件描述",
 *   "eventType": "policy",
 *   "sentiment": "positive",
 *   "importanceScore": 9,
 *   "impactSectors": ["银行", "券商"],
 *   "impactStocks": [],
 *   "confidence": 0.9,
 *   "createdAt": "2026-02-25T00:00:00Z"
 * }
 */
router.post('/index-event', async (req, res) => {
  try {
    await ensureInitialized();

    const event = req.body;

    if (!event || !event.id || !event.title) {
      return res.status(400).json({
        success: false,
        error: '请提供事件ID和标题'
      });
    }

    console.log(`📊 向量化事件: ${event.title}`);

    // 向量化事件
    const vectorizedEvent = await vectorStore.vectorizeEvent(event);

    // 存储向量
    await vectorStore.storeEvent(vectorizedEvent);

    res.json({
      success: true,
      data: {
        eventId: vectorizedEvent.id,
        vectorDimension: vectorizedEvent.vector.length,
        metadata: vectorizedEvent.metadata,
        message: '事件向量化并存储成功'
      }
    });

  } catch (error) {
    console.error('向量化事件失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/vector/index-batch
 * 批量向量化并存储事件
 *
 * Body:
 * {
 *   "limit": 100,
 *   "useHistorical": true
 * }
 */
router.post('/index-batch', async (req, res) => {
  try {
    await ensureInitialized();

    const { limit = 100, useHistorical = true, events = [] } = req.body;

    let indexed = [];

    if (useHistorical) {
      // 从数据库索引历史事件
      console.log(`📊 批量索引历史事件，最多${limit}条`);
      indexed = await vectorStore.indexHistoricalEvents(limit);
    } else if (events.length > 0) {
      // 索引提供的事件列表
      console.log(`📊 批量索引${events.length}个事件`);

      for (const event of events) {
        const vectorizedEvent = await vectorStore.vectorizeEvent(event);
        await vectorStore.storeEvent(vectorizedEvent);
        indexed.push(event.id);

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    res.json({
      success: true,
      data: {
        indexedCount: indexed.length,
        eventIds: indexed,
        message: `成功索引${indexed.length}个事件`
      }
    });

  } catch (error) {
    console.error('批量索引失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v2/vector/similar
 * 检索相似事件
 *
 * Body:
 * {
 *   "event": {
 *     "id": 9999,
 *     "title": "央行降准释放流动性",
 *     "description": "降低存款准备金率以支持实体经济",
 *     "eventType": "policy",
 *     "sentiment": "positive",
 *     "importanceScore": 9,
 *     "impactSectors": ["银行"],
 *     "impactStocks": [],
 *     "confidence": 0.9
 *   },
 *   "topK": 5
 * }
 */
router.post('/similar', async (req, res) => {
  try {
    await ensureInitialized();

    const { event, topK = 5 } = req.body;

    if (!event || !event.title) {
      return res.status(400).json({
        success: false,
        error: '请提供事件标题'
      });
    }

    console.log(`🔍 检索相似事件: ${event.title}`);

    // 检索相似事件
    const result = await retriever.retrieveSimilarEvents(event, topK);

    res.json({
      success: true,
      data: {
        query: event.title,
        total: result.total,
        events: result.events.map(e => ({
          eventId: e.eventId,
          similarity: e.similarity,
          title: e.details?.title,
          eventType: e.details?.event_type || e.metadata?.event_type,
          sentiment: e.details?.sentiment || e.metadata?.sentiment,
          importance: e.details?.importance_score || e.metadata?.importance,
          sectors: e.details?.impact_sectors || e.metadata?.sectors,
          createdAt: e.details?.created_at || e.metadata?.created_at
        })),
        analysis: result.analysis
      }
    });

  } catch (error) {
    console.error('检索相似事件失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/vector/stats
 * 获取向量存储统计信息
 */
router.get('/stats', async (req, res) => {
  try {
    await ensureInitialized();

    const stats = await retriever.getStats();

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('获取统计信息失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/v2/vector/clear
 * 清空向量存储（谨慎使用）
 */
router.delete('/clear', async (req, res) => {
  try {
    await ensureInitialized();

    await vectorStore.clearCollection();

    res.json({
      success: true,
      message: '向量存储已清空'
    });

  } catch (error) {
    console.error('清空向量存储失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v2/vector/search/:eventId
 * 根据事件ID查找相似事件（快捷方式）
 *
 * 首先从数据库获取事件详情，然后检索相似事件
 */
router.get('/search/:eventId', async (req, res) => {
  try {
    await ensureInitialized();

    const eventId = parseInt(req.params.eventId);
    const topK = parseInt(req.query.topK) || 5;

    if (isNaN(eventId)) {
      return res.status(400).json({
        success: false,
        error: '无效的事件ID'
      });
    }

    // 从数据库获取事件详情
    const query = 'SELECT * FROM news_events WHERE id = $1';
    const result = await retriever.pool.query(query, [eventId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: '事件不存在'
      });
    }

    const event = result.rows[0];
    const eventObj = {
      id: event.id,
      title: event.title,
      description: event.description,
      eventType: event.event_type,
      sentiment: event.sentiment,
      importanceScore: parseFloat(event.importance_score),
      impactSectors: event.impact_sectors || [],
      impactStocks: event.impact_stocks || [],
      confidence: parseFloat(event.confidence)
    };

    // 检索相似事件
    const similarEvents = await retriever.retrieveSimilarEvents(eventObj, topK);

    res.json({
      success: true,
      data: {
        queryEvent: {
          id: eventObj.id,
          title: eventObj.title
        },
        total: similarEvents.total,
        events: similarEvents.events,
        analysis: similarEvents.analysis
      }
    });

  } catch (error) {
    console.error('搜索相似事件失败:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
