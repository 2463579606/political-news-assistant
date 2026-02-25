/**
 * Similar Event Retriever
 * 相似事件检索器
 *
 * 功能：
 * 1. 检索历史相似事件
 * 2. 分析历史影响
 * 3. 生成经验总结
 * 4. 提供参考建议
 */

const VectorStoreService = require('../vector/vector-store-service');
const { Pool } = require('pg');

class SimilarEventRetriever {
  constructor() {
    this.vectorStore = new VectorStoreService();
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 初始化
   * @param {VectorStoreService} vectorStore - 可选的外部向量存储实例
   */
  async initialize(vectorStore = null) {
    if (vectorStore) {
      this.vectorStore = vectorStore;
    } else {
      await this.vectorStore.initialize();
    }
  }

  /**
   * 检索相似事件
   * @param {Object} event - 当前事件
   * @param {number} topK - 返回前K个相似事件
   */
  async retrieveSimilarEvents(event, topK = 5) {
    try {
      console.log(`🔍 检索相似事件: ${event.title}`);

      // 1. 使用向量存储搜索
      const similarEvents = await this.vectorStore.searchSimilarEvents(event, topK);

      if (similarEvents.length === 0) {
        console.log('⚠️  未找到相似事件');
        return {
          total: 0,
          events: [],
          analysis: null
        };
      }

      // 2. 获取事件的完整信息
      const eventIds = similarEvents.map(e => e.eventId);
      const detailedEvents = await this.getEventDetails(eventIds);

      // 3. 组合相似度和详细信息
      const combinedEvents = similarEvents.map((similar, index) => {
        const details = detailedEvents.find(d => d.id === similar.eventId);
        return {
          ...similar,
          details: details
        };
      });

      // 4. 分析相似事件
      const analysis = this.analyzeSimilarEvents(combinedEvents, event);

      console.log(`✅ 找到${combinedEvents.length}个相似事件`);

      return {
        total: combinedEvents.length,
        events: combinedEvents,
        analysis: analysis
      };

    } catch (error) {
      console.error('检索相似事件失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取事件详细信息
   */
  async getEventDetails(eventIds) {
    const query = `
      SELECT * FROM news_events
      WHERE id = ANY($1)
      ORDER BY created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [eventIds]);
      return result.rows;
    } catch (error) {
      console.error('获取事件详情失败:', error.message);
      return [];
    }
  }

  /**
   * 分析相似事件
   */
  analyzeSimilarEvents(similarEvents, currentEvent) {
    const analysis = {
      avgSimilarity: 0,
      commonPatterns: [],
      commonSectors: [],
      sentimentDistribution: {},
      importanceDistribution: {},
      experienceSummary: '',
      recommendations: []
    };

    if (similarEvents.length === 0) {
      return analysis;
    }

    // 1. 平均相似度
    const totalSimilarity = similarEvents.reduce((sum, e) => sum + (e.similarity || 0), 0);
    analysis.avgSimilarity = parseFloat((totalSimilarity / similarEvents.length).toFixed(3));

    // 2. 共同模式
    const eventTypes = {};
    const sectors = {};

    for (const event of similarEvents) {
      const meta = event.metadata || event.details;

      // 统计事件类型
      if (meta.event_type) {
        eventTypes[meta.event_type] = (eventTypes[meta.event_type] || 0) + 1;
      }

      // 统计板块
      const impactSectors = meta.impact_sectors || meta.details?.impactSectors || [];
      if (Array.isArray(impactSectors)) {
        for (const sector of impactSectors) {
          sectors[sector] = (sectors[sector] || 0) + 1;
        }
      }
    }

    analysis.commonPatterns = Object.entries(eventTypes)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    analysis.commonSectors = Object.entries(sectors)
      .sort((a, b) => b[1] - a[1])
      .map(([sector, count]) => ({ sector, count }));

    // 3. 情感分布
    const sentiments = { positive: 0, neutral: 0, negative: 0 };
    for (const event of similarEvents) {
      const sentiment = event.metadata?.sentiment || event.details?.sentiment || 'neutral';
      sentiments[sentiment]++;
    }
    analysis.sentimentDistribution = sentiments;

    // 4. 重要性分布
    const importanceRanges = { high: 0, medium: 0, low: 0 };
    for (const event of similarEvents) {
      const importance = event.metadata?.importance || event.details?.importance_score || 5;
      if (importance >= 7) importanceRanges.high++;
      else if (importance >= 4) importanceRanges.medium++;
      else importanceRanges.low++;
    }
    analysis.importanceDistribution = importanceRanges;

    // 5. 生成经验总结
    analysis.experienceSummary = this.generateExperienceSummary(similarEvents, analysis);

    // 6. 生成建议
    analysis.recommendations = this.generateRecommendations(similarEvents, currentEvent, analysis);

    return analysis;
  }

  /**
   * 生成经验总结
   */
  generateExperienceSummary(similarEvents, analysis) {
    const parts = [];

    // 事件类型总结
    if (analysis.commonPatterns.length > 0) {
      const topPattern = analysis.commonPatterns[0];
      parts.push(`历史上有${topPattern.count}次类似的${topPattern.type}事件`);
    }

    // 情感倾向总结
    const { sentimentDistribution } = analysis;
    const dominantSentiment = Object.entries(sentimentDistribution)
      .sort((a, b) => b[1] - a[1])[0];

    if (dominantSentiment[1] > 0) {
      const sentimentMap = {
        positive: '正面',
        negative: '负面',
        neutral: '中性'
      };
      parts.push(`这些事件通常产生${sentimentMap[dominantSentiment[0]]}影响`);
    }

    // 重要性总结
    const { importanceDistribution } = analysis;
    if (importanceDistribution.high > 0) {
      parts.push(`其中${importanceDistribution.high}次为重大事件`);
    }

    // 板块总结
    if (analysis.commonSectors.length > 0) {
      const topSector = analysis.commonSectors[0];
      parts.push(`主要影响${topSector.sector}等板块`);
    }

    return parts.length > 0 ? parts.join('，') + '。' : '暂无足够的历史数据。';
  }

  /**
   * 生成建议
   */
  generateRecommendations(similarEvents, currentEvent, analysis) {
    const recommendations = [];

    // 基于情感分布的建议
    const { sentimentDistribution } = analysis;
    if (sentimentDistribution.positive > sentimentDistribution.negative) {
      recommendations.push({
        type: 'sentiment',
        level: 'info',
        message: '类似历史事件多为正面影响，可适当乐观'
      });
    } else if (sentimentDistribution.negative > sentimentDistribution.positive) {
      recommendations.push({
        type: 'sentiment',
        level: 'warning',
        message: '类似历史事件多为负面影响，建议谨慎'
      });
    }

    // 基于重要性的建议
    const { importanceDistribution } = analysis;
    if (importanceDistribution.high >= 2) {
      recommendations.push({
        type: 'importance',
        level: 'warning',
        message: '历史上此类事件影响较大，建议密切关注'
      });
    }

    // 基于板块的建议
    if (analysis.commonSectors.length > 0) {
      const topSector = analysis.commonSectors[0];
      recommendations.push({
        type: 'sector',
        level: 'info',
        message: `可重点关注${topSector.sector}板块的相关股票`
      });
    }

    return recommendations;
  }

  /**
   * 获取历史影响数据
   * @param {Array} eventIds - 事件ID数组
   */
  async getHistoricalImpact(eventIds) {
    // TODO: 实现历史影响数据查询
    // 可以关联决策表，查看类似事件的实际结果
    return {
      events: eventIds.length,
      withDecisionData: 0,
      accuracy: null
    };
  }

  /**
   * 批量检索相似事件
   */
  async batchRetrieveSimilarEvents(events, topK = 5) {
    const results = [];

    for (const event of events) {
      try {
        const similar = await this.retrieveSimilarEvents(event, topK);
        results.push({
          eventId: event.id,
          success: true,
          similarCount: similar.total,
          events: similar.events,
          analysis: similar.analysis
        });

        // 延迟
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        results.push({
          eventId: event.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取统计信息
   */
  async getStats() {
    const vectorStats = await this.vectorStore.getStats();

    // 查询数据库中的事件总数
    const query = `
      SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT event_type) as unique_types,
        COUNT(DISTINCT sentiment) as unique_sentiments
      FROM news_events
    `;

    try {
      const result = await this.pool.query(query);

      return {
        vectorStore: vectorStats,
        database: {
          totalEvents: parseInt(result.rows[0].total_events),
          uniqueTypes: parseInt(result.rows[0].unique_types),
          uniqueSentiments: parseInt(result.rows[0].unique_sentiments)
        }
      };

    } catch (error) {
      console.error('获取统计信息失败:', error.message);
      return {
        vectorStore: vectorStats,
        database: null
      };
    }
  }
}

module.exports = SimilarEventRetriever;
