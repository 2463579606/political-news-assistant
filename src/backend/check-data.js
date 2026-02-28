const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'political_news',
  user: 'political_news_user',
  password: 'political_news_pass',
});

async function checkData() {
  try {
    const result = await pool.query(`
      SELECT
        stock_code,
        MIN(trade_date) as earliest,
        MAX(trade_date) as latest,
        COUNT(*) as records
      FROM stock_daily_data
      WHERE stock_code = '000001.SZ'
      GROUP BY stock_code
    `);

    console.log('\n📊 000001.SZ 数据可用性:');
    console.log(JSON.stringify(result.rows, null, 2));

    // 获取最新的决策数据
    const decisions = await pool.query(`
      SELECT
        COUNT(*) as total,
        MIN(decision_date) as earliest,
        MAX(decision_date) as latest
      FROM ai_decision_records
      WHERE stock_code = '000001.SZ'
    `);

    console.log('\n📊 000001.SZ 决策记录:');
    console.log(JSON.stringify(decisions.rows, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkData();
