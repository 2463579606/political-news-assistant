/**
 * 快速检查数据库状态
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkDB() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  try {
    const marketCount = await pool.query('SELECT COUNT(*) FROM market_data');
    const fundCount = await pool.query('SELECT COUNT(*) FROM fund_flow');
    const newsCount = await pool.query('SELECT COUNT(*) FROM news_events');

    console.log('数据库状态:');
    console.log(`  市场数据: ${marketCount.rows[0].count} 条`);
    console.log(`  资金流向: ${fundCount.rows[0].count} 条`);
    console.log(`  新闻事件: ${newsCount.rows[0].count} 条`);

  } catch (error) {
    console.error('查询失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkDB();
