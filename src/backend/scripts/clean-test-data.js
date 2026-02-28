/**
 * 清理测试数据
 */

require('dotenv').config();
const { Pool } = require('pg');

async function cleanTestData() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  console.log('🧹 清理测试数据...\n');

  try {
    // 清理测试市场数据
    console.log('1️⃣  清理测试市场数据');
    const marketResult = await pool.query(
      "DELETE FROM market_data WHERE stock_code = '000001.SZ'"
    );
    console.log(`✅ 删除 ${marketResult.rowCount}条市场数据`);

    // 清理测试资金流向数据
    console.log('\n2️⃣  清理测试资金流向数据');
    const fundResult = await pool.query(
      "DELETE FROM fund_flow WHERE stock_code = '000001.SZ'"
    );
    console.log(`✅ 删除 ${fundResult.rowCount}条资金流向数据`);

    // 清理测试新闻事件
    console.log('\n3️⃣  清理测试新闻事件');
    const newsResult = await pool.query(
      "DELETE FROM news_events"
    );
    console.log(`✅ 删除 ${newsResult.rowCount}条新闻事件`);

    // 重置序列
    console.log('\n4️⃣  重置数据库序列');
    await pool.query("SELECT setval('market_data_id_seq', 1, false)");
    await pool.query("SELECT setval('fund_flow_id_seq', 1, false)");
    await pool.query("SELECT setval('news_events_id_seq', 1, false)");
    console.log('✅ 序列重置完成');

    console.log('\n✅ 所有测试数据已清理!');
    console.log('\n💡 下一步: 配置TUSHARE_TOKEN并获取真实数据');

  } catch (error) {
    console.error('\n❌ 清理失败:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

// 运行清理
cleanTestData()
  .then(() => {
    console.log('✨ 完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 失败:', error);
    process.exit(1);
  });
