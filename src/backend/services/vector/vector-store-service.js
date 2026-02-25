/**
 * Vector Store Service
 * 向量存储服务
 *
 * 功能：
 * 1. ChromaDB集成
 * 2. 事件向量化
 * 3. 向量存储和检索
 * 4. 语义搜索
 */

const { ChromaClient } = require('chromadb');
const { Pool } = require('pg');

class VectorStoreService {
  constructor() {
    // ChromaDB客户端
    this.chromaClient = null;
    this.collection = null;
    this.collectionName = 'news_events_vectors';

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
   * 初始化ChromaDB
   */
  async initialize() {
    try {
      // 连接到ChromaDB
      this.chromaClient = new ChromaClient({
        path: process.env.CHROMADB_URL || 'http://localhost:8000'
      });

      // 获取或创建collection
      try {
        this.collection = await this.chromaClient.getCollection({
          name: this.collectionName
        });
        console.log(`✅ 获取到现有collection: ${this.collectionName}`);
      } catch (error) {
        // Collection不存在，创建新的
        this.collection = await this.chromaClient.createCollection({
          name: this.collectionName,
          metadata: {
            description: '新闻事件向量存储',
            created_at: new Date().toISOString()
          }
        });
        console.log(`✅ 创建新collection: ${this.collectionName}`);
      }

      return true;

    } catch (error) {
      console.error('ChromaDB初始化失败:', error.message);
      console.warn('⚠️  将使用模拟向量存储');
      this.collection = null;
      return false;
    }
  }

  /**
   * 向量化事件
   * @param {Object} event - 事件对象
   */
  async vectorizeEvent(event) {
    try {
      // 组合文本：标题 + 描述
      const text = `${event.title} ${event.description}`;

      // 生成文本嵌入向量（使用简单的词频统计作为模拟）
      const vector = await this.generateEmbedding(text);

      return {
        id: event.id.toString(),
        vector: vector,
        metadata: {
          event_id: event.id,
          event_type: event.eventType,
          sentiment: event.sentiment,
          importance: event.importanceScore,
          sectors: event.impactSectors,
          created_at: event.createdAt || new Date().toISOString()
        },
        document: text
      };

    } catch (error) {
      console.error('向量化事件失败:', error.message);
      throw error;
    }
  }

  /**
   * 生成文本嵌入向量
   * @param {string} text - 文本
   */
  async generateEmbedding(text) {
    // TODO: Phase 3集成真实的embedding模型
    // 例如: OpenAI text-embedding-ada-002
    // 或使用本地模型

    // 当前使用简单的TF-IDF模拟
    return this.generateMockEmbedding(text);
  }

  /**
   * 生成模拟嵌入向量
   * 基于简单的词频统计
   */
  generateMockEmbedding(text) {
    // 分词（简单按空格和标点分割）
    const words = text.toLowerCase()
      .replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1);

    // 词汇到向量的映射（简单的哈希）
    const vectorSize = 384; // 常见的embedding维度
    const vector = new Array(vectorSize).fill(0);

    for (const word of words) {
      // 使用简单的哈希函数将词映射到向量维度
      let hash = 0;
      for (let i = 0; i < word.length; i++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(i);
        hash |= 0;
      }

      const index = Math.abs(hash) % vectorSize;
      vector[index] += 1;
    }

    // 归一化
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude > 0) {
      return vector.map(val => val / magnitude);
    }

    return vector;
  }

  /**
   * 存储事件向量
   * @param {Object} vectorizedEvent - 向量化的事件
   */
  async storeEvent(vectorizedEvent) {
    try {
      if (!this.collection) {
        console.warn('ChromaDB未初始化，使用模拟存储');
        return this.storeMock(vectorizedEvent);
      }

      await this.collection.add({
        ids: [vectorizedEvent.id],
        embeddings: [vectorizedEvent.vector],
        metadatas: [vectorizedEvent.metadata],
        documents: [vectorizedEvent.document]
      });

      console.log(`✅ 向量已存储: ${vectorizedEvent.id}`);

    } catch (error) {
      console.error('存储向量失败:', error.message);
      // 失败时使用模拟存储
      return this.storeMock(vectorizedEvent);
    }
  }

  /**
   * 模拟存储
   */
  storeMock(vectorizedEvent) {
    // 在内存中存储（用于测试）
    if (!this.mockStore) {
      this.mockStore = new Map();
    }

    this.mockStore.set(vectorizedEvent.id, vectorizedEvent);
    console.log(`✅ 向量已存储（模拟）: ${vectorizedEvent.id}`);
  }

  /**
   * 搜索相似事件
   * @param {Object} event - 查询事件
   * @param {number} topK - 返回前K个结果
   */
  async searchSimilarEvents(event, topK = 5) {
    try {
      // 1. 向量化查询事件
      const vectorizedEvent = await this.vectorizeEvent(event);

      if (!this.collection) {
        return this.searchMock(vectorizedEvent.vector, topK);
      }

      // 2. 使用ChromaDB搜索
      const results = await this.collection.query({
        queryEmbeddings: [vectorizedEvent.vector],
        nResults: topK,
        where: {
          // 可以添加过滤条件
        }
      });

      // 3. 格式化结果
      const events = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        events.push({
          eventId: results.ids[0][i],
          similarity: 1 - results.distances[0][i], // 转换为相似度
          metadata: results.metadatas[0][i],
          document: results.documents[0][i]
        });
      }

      return events;

    } catch (error) {
      console.error('搜索相似事件失败:', error.message);
      return [];
    }
  }

  /**
   * 模拟搜索
   */
  async searchMock(queryVector, topK = 5) {
    if (!this.mockStore || this.mockStore.size === 0) {
      return [];
    }

    // 计算余弦相似度
    const similarities = [];

    for (const [id, storedEvent] of this.mockStore.entries()) {
      const similarity = this.cosineSimilarity(queryVector, storedEvent.vector);
      similarities.push({
        eventId: id,
        similarity: similarity,
        metadata: storedEvent.metadata,
        document: storedEvent.document
      });
    }

    // 按相似度排序，返回前K个
    similarities.sort((a, b) => b.similarity - a.similarity);

    return similarities.slice(0, topK);
  }

  /**
   * 计算余弦相似度
   */
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      return 0;
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * 批量向量化并存储历史事件
   */
  async indexHistoricalEvents(limit = 100) {
    try {
      console.log(`🔄 开始索引历史事件，最多${limit}条`);

      // 从数据库获取历史事件
      const query = `
        SELECT * FROM news_events
        ORDER BY created_at DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);

      if (result.rows.length === 0) {
        console.warn('⚠️  数据库中没有历史事件');
        return [];
      }

      console.log(`📊 找到${result.rows.length}条历史事件`);

      // 批量向量化并存储
      const indexed = [];
      for (const row of result.rows) {
        const event = {
          id: row.id,
          title: row.title,
          description: row.description,
          eventType: row.event_type,
          sentiment: row.sentiment,
          importanceScore: parseFloat(row.importance_score),
          impactSectors: row.impact_sectors || [],
          impactStocks: row.impact_stocks || [],
          confidence: parseFloat(row.confidence),
          createdAt: row.created_at
        };

        const vectorizedEvent = await this.vectorizeEvent(event);
        await this.storeEvent(vectorizedEvent);

        indexed.push(event.id);

        // 延迟避免过载
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`✅ 成功索引${indexed.length}条事件`);

      return indexed;

    } catch (error) {
      console.error('索引历史事件失败:', error.message);
      throw error;
    }
  }

  /**
   * 获取collection统计信息
   */
  async getStats() {
    try {
      if (!this.collection) {
        return {
          type: 'mock',
          count: this.mockStore ? this.mockStore.size : 0
        };
      }

      const count = await this.collection.count();

      return {
        type: 'chromadb',
        count: count,
        name: this.collectionName
      };

    } catch (error) {
      console.error('获取统计信息失败:', error.message);
      return {
        type: 'unknown',
        count: 0
      };
    }
  }

  /**
   * 清空collection
   */
  async clearCollection() {
    try {
      if (this.collection) {
        // ChromaDB需要删除并重新创建collection
        await this.chromaClient.deleteCollection({
          name: this.collectionName
        });

        this.collection = await this.chromaClient.createCollection({
          name: this.collectionName
        });

        console.log('✅ ChromaDB collection已清空');
      }

      if (this.mockStore) {
        this.mockStore.clear();
        console.log('✅ 模拟存储已清空');
      }

    } catch (error) {
      console.error('清空collection失败:', error.message);
      throw error;
    }
  }
}

module.exports = VectorStoreService;
