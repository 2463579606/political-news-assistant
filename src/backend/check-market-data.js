const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'political_news',
  user: 'political_news_user',
  password: 'political_news_pass'
});

async function checkData() {
  try {
    // 检查market_data
    const market = await pool.query(`
      SELECT
        stock_code,
        COUNT(*) as records,
        MIN(trade_date) as earliest,
        MAX(trade_date) as latest
      FROM market_data
      GROUP BY stock_code
      ORDER BY records DESC
      LIMIT 10
    `);

    console.log('📊 Market Data (Top 10):');
    market.rows.forEach((row) => {
      console.log(`  ${row.stock_code}: ${row.records}条 (${row.earliest} ~ ${row.latest})`);
    });

    // 检查decisions表
    const decisions = await pool.query(`
      SELECT
        stock_code,
        COUNT(*) as records,
        MIN(created_at) as earliest,
        MAX(created_at) as latest
      FROM decisions
      GROUP BY stock_code
      ORDER BY records DESC
      LIMIT 10
    `);

    console.log('\n📊 Decision Records (Top 10):');
    decisions.rows.forEach((row) => {
      console.log(`  ${row.stock_code}: ${row.records}条 (${row.earliest} ~ ${row.latest})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
