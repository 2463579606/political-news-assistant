/**
 * Event Extractor
 * 新闻事件提取器
 *
 * 功能：
 * 1. 使用Claude API从新闻中提取事件
 * 2. 事件类型识别
 * 3. 重要性评分
 * 4. 影响评估
 * 5. 置信度计算
 */

const Anthropic = require('@anthropic-ai/sdk');
const { Pool } = require('pg');

class EventExtractor {
  constructor() {
    // Claude API初始化
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    // PostgreSQL连接池
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });
  }

  /**
   * 从新闻中提取事件
   * @param {Object} newsItem - 新闻对象
   * @param {number} newsItem.id - 新闻ID
   * @param {string} newsItem.title - 新闻标题
   * @param {string} newsItem.content - 新闻内容
   * @param {string} newsItem.source - 新闻来源
   * @param {string} newsItem.publishTime - 发布时间
   */
  async extract(newsItem) {
    try {
      if (!process.env.ANTHROPIC_API_KEY) {
        console.warn('⚠️  ANTHROPIC_API_KEY not set, using mock extraction');
        return this.extractMock(newsItem);
      }

      console.log(`🤖 Claude API提取事件: ${newsItem.title}`);

      // 1. 使用Claude API提取事件
      const eventDraft = await this.extractWithClaude(newsItem);

      // 2. 计算置信度
      const confidence = this.calculateConfidence(eventDraft);

      // 3. 构建事件对象
      const event = {
        newsId: newsItem.id,
        title: eventDraft.title,
        description: eventDraft.description,
        eventType: eventDraft.eventType,
        importanceScore: eventDraft.importanceScore,
        sentiment: eventDraft.sentiment,
        sentimentScore: eventDraft.sentimentScore,
        impactDuration: eventDraft.impactDuration,
        impactSectors: eventDraft.impactSectors,
        impactStocks: eventDraft.impactStocks,
        confidence: confidence,
        reasoning: eventDraft.reasoning
      };

      console.log(`✅ 事件提取完成: ${event.eventType} (重要性: ${event.importanceScore}/10)`);

      return event;

    } catch (error) {
      console.error('事件提取失败:', error.message);
      // 失败时使用模拟提取
      return this.extractMock(newsItem);
    }
  }

  /**
   * 使用Claude API提取事件
   */
  async extractWithClaude(newsItem) {
    const prompt = this.buildExtractionPrompt(newsItem);

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: prompt
        }]
      });

      // 解析Claude响应
      const content = response.content[0].text;
      return this.parseClaudeResponse(content);

    } catch (error) {
      console.error('Claude API调用失败:', error.message);
      throw error;
    }
  }

  /**
   * 构建提取提示词
   */
  buildExtractionPrompt(newsItem) {
    return `你是一个专业的金融新闻分析专家。请从以下新闻中提取重要的事件信息。

新闻标题：${newsItem.title}
新闻内容：${newsItem.content || '无内容'}
来源：${newsItem.source}
发布时间：${newsItem.publishTime}

请以JSON格式返回以下信息：

{
  "title": "事件标题（简短概括，10字以内）",
  "description": "事件详细描述（50-100字）",
  "eventType": "事件类型（必须是以下之一：policy政策/meeting会议/macro_data宏观数据/emergency突发事件/market市场）",
  "importanceScore": 重要性评分（1-10的整数，10为最重要，7-10为重大事件，4-6为重要事件，1-3为一般事件）",
  "sentiment": "情感倾向（positive正面/negative中性/negative负面，根据事件对股市的影响判断）",
  "sentimentScore": "情感分数（-1到1之间，正数为正面，负数为负面，0为中性）",
  "impactDuration": "影响持续期（short短期/medium中期/long长期）",
  "impactSectors": ["受影响的行业板块1", "板块2", ...],
  "impactStocks": ["受影响的股票代码1", "代码2", ...],
  "reasoning": "分析理由（简短说明判断依据）"
}

判断标准：
1. 重要性评分：
   - 10分：国家级重大政策、央行重大决定
   - 8-9分：部委政策、重要会议
   - 5-7分：行业政策、地方政策
   - 3-4分：公司重大事件
   - 1-2分：一般市场消息

2. 事件类型：
   - policy: 各类政策、法规、监管措施
   - meeting: 重要会议、峰会、发布会
   - macro_data: 经济数据发布（GDP、CPI、PMI等）
   - emergency: 突发事件、自然灾害、地缘政治
   - market: 市场相关消息、行情动态

3. 情感判断：
   - positive: 利好消息，利好股市
   - neutral: 中性消息，影响不确定
   - negative: 利空消息，利空股市

只返回JSON，不要其他内容。`;
  }

  /**
   * 解析Claude响应
   */
  parseClaudeResponse(content) {
    try {
      // 提取JSON部分
      let jsonStr = content;

      // 如果包含```json标记，提取其中的JSON
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      // 如果包含```标记，提取其中的内容
      const codeMatch = content.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        jsonStr = codeMatch[1];
      }

      const data = JSON.parse(jsonStr.trim());

      // 验证必需字段
      const requiredFields = [
        'title', 'description', 'eventType', 'importanceScore',
        'sentiment', 'sentimentScore', 'impactDuration',
        'impactSectors', 'impactStocks', 'reasoning'
      ];

      for (const field of requiredFields) {
        if (!data.hasOwnProperty(field)) {
          throw new Error(`缺少必需字段: ${field}`);
        }
      }

      // 验证eventType
      const validEventTypes = ['policy', 'meeting', 'macro_data', 'emergency', 'market'];
      if (!validEventTypes.includes(data.eventType)) {
        throw new Error(`无效的eventType: ${data.eventType}`);
      }

      // 验证sentiment
      const validSentiments = ['positive', 'neutral', 'negative'];
      if (!validSentiments.includes(data.sentiment)) {
        throw new Error(`无效的sentiment: ${data.sentiment}`);
      }

      // 确保impactSectors和impactStocks是数组
      if (!Array.isArray(data.impactSectors)) {
        data.impactSectors = [];
      }
      if (!Array.isArray(data.impactStocks)) {
        data.impactStocks = [];
      }

      return data;

    } catch (error) {
      console.error('解析Claude响应失败:', error.message);
      console.error('响应内容:', content);
      throw new Error(`JSON解析失败: ${error.message}`);
    }
  }

  /**
   * 计算置信度
   */
  calculateConfidence(eventDraft) {
    let confidence = 0.7; // 基础置信度

    // 如果包含详细的板块和股票信息，提高置信度
    if (eventDraft.impactSectors && eventDraft.impactSectors.length > 0) {
      confidence += 0.1;
    }

    if (eventDraft.impactStocks && eventDraft.impactStocks.length > 0) {
      confidence += 0.1;
    }

    // 如果提供了分析理由，提高置信度
    if (eventDraft.reasoning && eventDraft.reasoning.length > 20) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 模拟事件提取（用于测试或API不可用时）
   */
  extractMock(newsItem) {
    console.log(`📝 模拟事件提取: ${newsItem.title}`);

    // 简单的关键词匹配来模拟事件提取
    const title = newsItem.title.toLowerCase();
    const content = (newsItem.content || '').toLowerCase();

    let eventType = 'market';
    let importanceScore = 3;
    let sentiment = 'neutral';
    let sentimentScore = 0;

    // 事件类型识别
    if (title.includes('央行') || title.includes('降准') || title.includes('降息')) {
      eventType = 'policy';
      importanceScore = 9;
      sentiment = 'positive';
      sentimentScore = 0.8;
    } else if (title.includes('会议') || title.includes('峰会')) {
      eventType = 'meeting';
      importanceScore = 7;
      sentiment = 'neutral';
      sentimentScore = 0.2;
    } else if (title.includes('GDP') || title.includes('CPI') || title.includes('PMI')) {
      eventType = 'macro_data';
      importanceScore = 6;
      sentiment = 'neutral';
      sentimentScore = 0;
    } else if (title.includes('疫情') || title.includes('灾害') || title.includes('冲突')) {
      eventType = 'emergency';
      importanceScore = 8;
      sentiment = 'negative';
      sentimentScore = -0.7;
    }

    // 简单的板块映射
    const impactSectors = [];
    const sectorKeywords = {
      '银行': ['银行', '央行', '利率', '降准'],
      '地产': ['地产', '房地产', '住房'],
      '科技': ['科技', '芯片', '半导体', 'AI'],
      '医药': ['医药', '医疗', '疫苗'],
      '新能源': ['新能源', '光伏', '风电', '锂电'],
      '消费': ['消费', '零售']
    };

    for (const [sector, keywords] of Object.entries(sectorKeywords)) {
      if (keywords.some(kw => title.includes(kw) || content.includes(kw))) {
        impactSectors.push(sector);
      }
    }

    return {
      newsId: newsItem.id,
      title: title.substring(0, 20) + '...',
      description: content.substring(0, 100) + '...',
      eventType: eventType,
      importanceScore: importanceScore,
      sentiment: sentiment,
      sentimentScore: sentimentScore,
      impactDuration: 'medium',
      impactSectors: impactSectors.length > 0 ? impactSectors : ['综合'],
      impactStocks: [],
      confidence: 0.6,
      reasoning: '基于关键词的模拟提取',
      isMock: true
    };
  }

  /**
   * 保存事件到数据库
   */
  async saveToDatabase(event) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO news_events (
          news_id, title, description, event_type, importance_score,
          sentiment, sentiment_score, impact_duration, impact_sectors, impact_stocks,
          confidence, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP)
        RETURNING id
      `;

      const result = await client.query(insertQuery, [
        event.newsId,
        event.title,
        event.description,
        event.eventType,
        event.importanceScore,
        event.sentiment,
        event.sentimentScore,
        event.impactDuration,
        JSON.stringify(event.impactSectors),
        JSON.stringify(event.impactStocks),
        event.confidence
      ]);

      await client.query('COMMIT');

      console.log(`✅ 事件已保存到数据库 (ID: ${result.rows[0].id})`);

      return result.rows[0].id;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('保存事件失败:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 批量提取事件
   */
  async batchExtract(newsItems) {
    const results = [];

    for (const newsItem of newsItems) {
      try {
        const event = await this.extract(newsItem);
        const eventId = await this.saveToDatabase(event);
        results.push({
          newsId: newsItem.id,
          success: true,
          eventId: eventId,
          event: event
        });

        // 延迟避免API限流
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        results.push({
          newsId: newsItem.id,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * 从数据库获取事件
   */
  async getFromDatabase(newsId) {
    const query = `
      SELECT * FROM news_events
      WHERE news_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.pool.query(query, [newsId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];

      return {
        id: row.id,
        newsId: row.news_id,
        title: row.title,
        description: row.description,
        eventType: row.event_type,
        importanceScore: parseFloat(row.importance_score),
        sentiment: row.sentiment,
        sentimentScore: parseFloat(row.sentiment_score),
        impactDuration: row.impact_duration,
        impactSectors: row.impact_sectors || [],
        impactStocks: row.impact_stocks || [],
        confidence: parseFloat(row.confidence),
        createdAt: row.created_at
      };

    } catch (error) {
      console.error('从数据库获取事件失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取最近的重要事件
   */
  async getRecentEvents(limit = 20, minImportance = 5) {
    const query = `
      SELECT * FROM news_events
      WHERE importance_score >= $1
      ORDER BY created_at DESC, importance_score DESC
      LIMIT $2
    `;

    try {
      const result = await this.pool.query(query, [minImportance, limit]);
      return result.rows;
    } catch (error) {
      console.error('获取最近事件失败:', error.message);
      throw error;
    }
  }
}

module.exports = EventExtractor;
