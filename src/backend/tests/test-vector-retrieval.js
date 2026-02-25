/**
 * 向量检索测试脚本
 * 测试ChromaDB向量存储和相似事件检索
 */

require('dotenv').config();
const VectorStoreService = require('../services/vector/vector-store-service');
const SimilarEventRetriever = require('../services/similarity/similar-event-retriever');
const { Pool } = require('pg');

async function testVectorRetrieval() {
  const vectorStore = new VectorStoreService();
  const retriever = new SimilarEventRetriever();
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('🧪 开始测试向量检索功能...\n');

  try {
    // 1. 初始化
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  初始化向量存储');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const initialized = await vectorStore.initialize();
    console.log(`✅ 向量存储初始化: ${initialized ? 'ChromaDB' : '模拟模式'}`);

    // 2. 创建测试事件
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  创建测试事件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testEvents = [
      {
        id: 9991,
        title: '央行宣布下调存款准备金率',
        description: '央行决定降准0.5个百分点',
        eventType: 'policy',
        sentiment: 'positive',
        importanceScore: 9,
        impactSectors: ['银行', '券商'],
        impactStocks: [],
        confidence: 0.9,
        createdAt: new Date().toISOString()
      },
      {
        id: 9992,
        title: '降息刺激经济增长',
        description: '央行下调利率0.25个百分点',
        eventType: 'policy',
        sentiment: 'positive',
        importanceScore: 8,
        impactSectors: ['银行', '房地产'],
        impactStocks: [],
        confidence: 0.85,
        createdAt: new Date().toISOString()
      },
      {
        id: 9993,
        title: '房地产市场调控收紧',
        description: '多地出台房地产调控新政策',
        eventType: 'policy',
        sentiment: 'negative',
        importanceScore: 7,
        impactSectors: ['房地产'],
        impactStocks: [],
        confidence: 0.8,
        createdAt: new Date().toISOString()
      }
    ];

    // 保存测试事件到数据库
    for (const event of testEvents) {
      await pool.query(
        `INSERT INTO news_events (news_id, title, description, event_type, importance_score, sentiment, sentiment_score, impact_duration, impact_sectors, impact_stocks, confidence, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [event.id, event.title, event.description, event.eventType, event.importanceScore,
         event.sentiment, 0.5, 'medium', JSON.stringify(event.impactSectors),
         JSON.stringify(event.impactStocks), event.confidence, event.createdAt]
      );
    }

    console.log(`✅ 创建${testEvents.length}个测试事件`);

    // 3. 向量化事件
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  向量化事件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const event of testEvents) {
      const vectorized = await vectorStore.vectorizeEvent(event);
      await vectorStore.storeEvent(vectorized);

      console.log(`✅ 事件${event.id}: 向量维度=${vectorized.vector.length}`);
    }

    // 4. 检索相似事件
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  检索相似事件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const queryEvent = {
      id: 9999,
      title: '央行降准释放流动性',
      description: '降低存款准备金率以支持实体经济',
      eventType: 'policy',
      sentiment: 'positive',
      importanceScore: 9,
      impactSectors: ['银行'],
      impactStocks: [],
      confidence: 0.9
    };

    console.log(`\n查询事件: ${queryEvent.title}`);
    console.log(`期望匹配: ${testEvents[0].title} 和 ${testEvents[1].title}`);

    await retriever.initialize(vectorStore);
    const similar = await retriever.retrieveSimilarEvents(queryEvent, 3);

    console.log(`\n✅ 找到${similar.total}个相似事件:`);
    similar.events.forEach((event, index) => {
      console.log(`  ${index + 1}. 相似度=${event.similarity.toFixed(3)}`);
      console.log(`     事件: ${event.details?.title || event.metadata?.event_id}`);
      console.log(`     类型: ${event.details?.event_type || event.metadata?.event_type}`);
      console.log(`     情感: ${event.details?.sentiment || event.metadata?.sentiment}`);
    });

    // 5. 分析结果
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  相似性分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (similar.analysis) {
      const analysis = similar.analysis;
      console.log(`\n平均相似度: ${analysis.avgSimilarity}`);
      console.log(`\n共同模式:`);
      analysis.commonPatterns.forEach(p => {
        console.log(`  - ${p.type}: ${p.count}次`);
      });

      console.log(`\n常见板块:`);
      analysis.commonSectors.forEach(s => {
        console.log(`  - ${s.sector}: ${s.count}次`);
      });

      console.log(`\n情感分布:`);
      console.log(`  正面: ${analysis.sentimentDistribution.positive}`);
      console.log(`  中性: ${analysis.sentimentDistribution.neutral}`);
      console.log(`  负面: ${analysis.sentimentDistribution.negative}`);

      console.log(`\n重要性分布:`);
      console.log(`  高: ${analysis.importanceDistribution.high}`);
      console.log(`  中: ${analysis.importanceDistribution.medium}`);
      console.log(`  低: ${analysis.importanceDistribution.low}`);

      console.log(`\n经验总结:`);
      console.log(`  ${analysis.experienceSummary}`);

      console.log(`\n建议:`);
      analysis.recommendations.forEach(rec => {
        console.log(`  [${rec.level}] ${rec.message}`);
      });
    }

    // 6. 统计信息
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6️⃣  统计信息');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stats = await retriever.getStats();
    console.log('\n向量存储:');
    console.log(`  类型: ${stats.vectorStore.type}`);
    console.log(`  事件数: ${stats.vectorStore.count}`);

    if (stats.database) {
      console.log('\n数据库:');
      console.log(`  总事件数: ${stats.database.totalEvents}`);
      console.log(`  事件类型数: ${stats.database.uniqueTypes}`);
      console.log(`  情感类型数: ${stats.database.uniqueSentiments}`);
    }

    // 7. 清理测试数据
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('7️⃣  清理测试数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    await pool.query('DELETE FROM news_events WHERE news_id = ANY($1)', [
      [9991, 9992, 9993]
    ]);
    await vectorStore.clearCollection();

    console.log('✅ 测试数据已清理');

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 向量检索测试完成!');
    console.log('\n💡 注意事项:');
    console.log('   - ChromaDB未运行时使用模拟向量存储');
    console.log('   - 当前使用简单的词频向量（Phase 3将使用真实embedding）');
    console.log('   - 相似度计算使用余弦相似度');
    console.log('   - 建议启动ChromaDB: docker run -p 8000:8000 chromadb/chroma');
    console.log('');

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行测试
testVectorRetrieval()
  .then(() => {
    console.log('✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
