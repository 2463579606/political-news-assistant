/**
 * News Score Service
 * 消息面评分服务
 *
 * 功能：
 * 1. 计算事件重要性评分
 * 2. 计算情感倾向评分
 * 3. 计算相似历史事件影响评分
 * 4. 综合消息面评分
 */

const SimilarEventRetriever = require('../similarity/similar-event-retriever');
const { Pool } = require('pg');

class NewsScoreService {
  constructor() {
    this.retriever = new SimilarEventRetriever();
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 计算消息面综合评分
   * @param {string} stockCode - 股票代码
   */
  async calculateNewsScore(stockCode) {
    try {
      console.log(`📰 计算消息面评分: ${stockCode}`);

      // 1. 获取最近的新闻事件
      const recentEvents = await this.getRecentEvents(stockCode, 7); // 最近7天

      if (!recentEvents || recentEvents.length === 0) {
        // 没有新闻事件，返回中性评分
        return this.getNeutralScore(stockCode);
      }

      // 2. 计算各维度评分
      const importanceScore = this.calculateImportanceScore(recentEvents);
      const sentimentScore = this.calculateSentimentScore(recentEvents);
      const historyScore = await this.calculateHistoryScore(recentEvents);

      // 3. 加权计算综合评分
      const overallScore = (
        importanceScore * 0.40 +
        sentimentScore * 0.30 +
        historyScore * 0.30
      );

      const result = {
        stockCode: stockCode,
        scoreDate: new Date().toISOString().split('T')[0],
        scores: {
          importance: importanceScore,
          sentiment: sentimentScore,
          history: historyScore,
          overall: parseFloat(overallScore.toFixed(2))
        },
        grade: this.getGrade(overallScore),
        details: {
          eventCount: recentEvents.length,
          events: recentEvents.slice(0, 5).map(e => ({
            eventId: e.id,
            title: e.title,
            eventType: e.event_type,
            importance: parseFloat(e.importance_score),
            sentiment: e.sentiment,
            sentimentScore: parseFloat(e.sentiment_score),
            createdAt: e.created_at
          }))
        }
      };

      console.log(`✅ 消息面评分: ${result.scores.overall} (${result.grade})`);

      return result;

    } catch (error) {
      console.error('计算消息面评分失败:', error.message);
      return this.getNeutralScore(stockCode);
    }
  }

  /**
   * 获取最近的新闻事件
   */
  async getRecentEvents(stockCode, days = 7) {
    // 查询影响该股票的事件
    const query = `
      SELECT ne.* FROM news_events ne
      WHERE ne.created_at >= CURRENT_DATE - INTERVAL '${days} days'
      AND (
        ne.impact_stocks::jsonb ? $1
        OR ne.event_type IN ('policy', 'meeting', 'macro_data', 'emergency')
      )
      ORDER BY ne.importance_score DESC, ne.created_at DESC
      LIMIT 10
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);
      return result.rows;

    } catch (error) {
      console.error('获取新闻事件失败:', error.message);
      return [];
    }
  }

  /**
   * 计算事件重要性评分 (40%)
   */
  calculateImportanceScore(events) {
    if (events.length === 0) return 50;

    let totalScore = 0;

    for (const event of events) {
      const importance = parseFloat(event.importance_score || 5);

      // 重大事件 (9-10分)
      if (importance >= 9) {
        totalScore += 40;
      }
      // 重要事件 (7-8分)
      else if (importance >= 7) {
        totalScore += 30;
      }
      // 一般事件 (4-6分)
      else if (importance >= 4) {
        totalScore += 15;
      }
      // 轻微事件 (1-3分)
      else {
        totalScore += 5;
      }
    }

    // 取平均分
    const avgScore = totalScore / events.length;

    // 考虑事件数量（事件多，影响更大）
    const eventFactor = Math.min(1.2, 1 + events.length * 0.05);

    return Math.min(100, avgScore * eventFactor);
  }

  /**
   * 计算情感倾向评分 (30%)
   */
  calculateSentimentScore(events) {
    if (events.length === 0) return 50;

    let totalScore = 0;

    for (const event of events) {
      const sentimentScore = parseFloat(event.sentiment_score || 0);
      const sentiment = event.sentiment || 'neutral';

      // 强烈正面 (情感>0.7)
      if (sentiment === 'positive' && sentimentScore > 0.7) {
        totalScore += 30;
      }
      // 正面 (情感>0.3)
      else if (sentiment === 'positive' && sentimentScore > 0.3) {
        totalScore += 20;
      }
      // 中性 (情感≈0)
      else if (sentiment === 'neutral' || Math.abs(sentimentScore) < 0.3) {
        totalScore += 0;
      }
      // 负面 (情感<-0.3)
      else if (sentiment === 'negative' && sentimentScore < -0.3) {
        totalScore -= 20;
      }
      // 强烈负面 (情感<-0.7)
      else if (sentiment === 'negative' && sentimentScore < -0.7) {
        totalScore -= 30;
      }
    }

    // 取平均并映射到0-100
    const avgScore = totalScore / events.length;
    return Math.max(0, Math.min(100, 50 + avgScore));
  }

  /**
   * 计算相似历史事件影响评分 (30%)
   */
  async calculateHistoryScore(events) {
    if (events.length === 0) return 50;

    // 对每个事件查找相似历史事件
    let totalPositive = 0;
    let totalNegative = 0;
    let eventCount = 0;

    for (const event of events) {
      try {
        // 构造查询事件
        const queryEvent = {
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

        // 检索相似事件（只取前3个）
        const similar = await this.retriever.retrieveSimilarEvents(queryEvent, 3);

        if (similar.analysis) {
          const { sentimentDistribution } = similar.analysis;

          // 历史正面影响
          if (sentimentDistribution.positive > sentimentDistribution.negative) {
            totalPositive += 15;
          }
          // 历史负面影响
          else if (sentimentDistribution.negative > sentimentDistribution.positive) {
            totalNegative += 15;
          }

          eventCount++;
        }

      } catch (error) {
        console.error(`分析事件${event.id}历史影响失败:`, error.message);
        continue;
      }
    }

    if (eventCount === 0) {
      return 50; // 无相似历史事件，返回中性
    }

    // 计算历史影响评分
    const avgPositive = totalPositive / eventCount;
    const avgNegative = totalNegative / eventCount;

    return Math.max(0, Math.min(100, 50 + avgPositive - avgNegative));
  }

  /**
   * 获取评分等级
   */
  getGrade(score) {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    if (score >= 40) return 'E';
    return 'F';
  }

  /**
   * 获取中性评分（无数据时）
   */
  getNeutralScore(stockCode) {
    return {
      stockCode: stockCode,
      scoreDate: new Date().toISOString().split('T')[0],
      scores: {
        importance: 50,
        sentiment: 50,
        history: 50,
        overall: 50.00
      },
      grade: 'D',
      details: {
        eventCount: 0,
        events: []
      },
      warning: '无相关新闻事件，返回中性评分'
    };
  }

  /**
   * 批量计算消息面评分
   */
  async batchCalculateNewsScores(stockCodes) {
    const results = [];

    for (const stockCode of stockCodes) {
      try {
        const score = await this.calculateNewsScore(stockCode);
        results.push({
          success: true,
          stockCode: stockCode,
          data: score
        });

        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        results.push({
          success: false,
          stockCode: stockCode,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 获取重大事件提醒
   */
  async getMajorEventAlerts(stockCode, hours = 24) {
    const query = `
      SELECT * FROM news_events
      WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '${hours} hours'
      AND (
        impact_stocks::jsonb ? $1
        OR event_type IN ('policy', 'meeting', 'emergency')
      )
      AND importance_score >= 8
      ORDER BY importance_score DESC, created_at DESC
    `;

    try {
      const result = await this.pool.query(query, [stockCode]);

      return {
        stockCode: stockCode,
        hasMajorEvents: result.rows.length > 0,
        count: result.rows.length,
        events: result.rows.map(e => ({
          eventId: e.id,
          title: e.title,
          importance: parseFloat(e.importance_score),
          sentiment: e.sentiment,
          createdAt: e.created_at
        }))
      };

    } catch (error) {
      console.error('获取重大事件提醒失败:', error.message);
      return {
        stockCode: stockCode,
        hasMajorEvents: false,
        count: 0,
        events: [],
        error: error.message
      };
    }
  }
}

module.exports = NewsScoreService;
