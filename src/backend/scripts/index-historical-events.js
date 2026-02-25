/**
 * 索引历史事件到向量数据库
 *
 * 用途：将数据库中的历史新闻事件向量化并存储到向量数据库
 */

require('dotenv').config();
const VectorStoreService = require('../services/vector/vector-store-service');
const { Pool } = require('pg');

async function indexHistoricalEvents() {
  const vectorStore = new VectorStoreService();
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('🔄 开始索引历史事件到向量数据库...\n');

  try {
    // 1. 初始化向量存储
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  初始化向量存储');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const initialized = await vectorStore.initialize();
    console.log(`✅ 向量存储初始化: ${initialized ? 'ChromaDB' : '模拟模式'}`);

    // 2. 查询历史事件
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  查询历史事件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const limit = 100; // 索引最多100条
    const query = `
      SELECT * FROM news_events
      ORDER BY created_at DESC
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);
    console.log(`📊 找到${result.rows.length}条历史事件`);

    if (result.rows.length === 0) {
      console.warn('⚠️  数据库中没有历史事件');
      console.log('💡 提示：请先运行新闻事件提取测试创建测试数据\n');
      return;
    }

    // 3. 批量向量化
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  批量向量化事件');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const indexed = [];
    const failed = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      const progress = `  [${i + 1}/${result.rows.length}]`;

      try {
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

        const vectorizedEvent = await vectorStore.vectorizeEvent(event);
        await vectorStore.storeEvent(vectorizedEvent);

        indexed.push(event.id);
        console.log(`${progress} ✅ 事件${event.id}: ${event.title.substring(0, 30)}...`);

      } catch (error) {
        failed.push({ id: row.id, error: error.message });
        console.error(`${progress} ❌ 事件${row.id}失败: ${error.message}`);
      }

      // 延迟避免过载
      if (i < result.rows.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // 4. 统计结果
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  索引结果统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    console.log(`\n总事件数: ${result.rows.length}`);
    console.log(`成功索引: ${indexed.length} ✅`);
    console.log(`索引失败: ${failed.length} ❌`);
    console.log(`成功率: ${((indexed.length / result.rows.length) * 100).toFixed(1)}%`);

    if (failed.length > 0) {
      console.log('\n失败事件列表:');
      failed.forEach(f => {
        console.log(`  - 事件${f.id}: ${f.error}`);
      });
    }

    // 5. 向量存储统计
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  向量存储统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const stats = await vectorStore.getStats();
    console.log(`\n向量存储类型: ${stats.type}`);
    console.log(`向量事件总数: ${stats.count}`);
    console.log(`数据库事件总数: ${result.rows.length}`);

    // 6. 事件类型分布
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('6️⃣  事件类型分布');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const eventTypeCount = {};
    result.rows.forEach(row => {
      const type = row.event_type;
      eventTypeCount[type] = (eventTypeCount[type] || 0) + 1;
    });

    console.log('\n事件类型统计:');
    Object.entries(eventTypeCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  ${type}: ${count}条`);
      });

    // 7. 情感分布
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('7️⃣  情感分布');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const sentimentCount = {};
    result.rows.forEach(row => {
      const sentiment = row.sentiment;
      sentimentCount[sentiment] = (sentimentCount[sentiment] || 0) + 1;
    });

    console.log('\n情感倾向统计:');
    Object.entries(sentimentCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([sentiment, count]) => {
        const percentage = ((count / result.rows.length) * 100).toFixed(1);
        console.log(`  ${sentiment}: ${count}条 (${percentage}%)`);
      });

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 历史事件索引完成!');
    console.log('\n💡 现在可以使用相似事件检索功能查询历史事件了');
    console.log('');

  } catch (error) {
    console.error('\n❌ 索引失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行索引
indexHistoricalEvents()
  .then(() => {
    console.log('✨ 索引完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 索引失败:', error);
    process.exit(1);
  });
