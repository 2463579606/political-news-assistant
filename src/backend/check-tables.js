const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'political_news',
  user: 'political_news_user',
  password: 'political_news_pass'
});

async function checkTables() {
  try {
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('📊 数据库表列表:');
    result.rows.forEach((row, i) => {
      console.log(`  ${i+1}. ${row.table_name}`);
    });

    // 检查decision记录表
    const decisions = await pool.query(`
      SELECT
        COUNT(*) as total,
        MIN(decision_date) as earliest,
        MAX(decision_date) as latest
      FROM ai_decision_records
    `);

    console.log('\n📊 决策记录统计:');
    console.log(`  总记录数: ${decisions.rows[0].total}`);
    console.log(`  最早日期: ${decisions.rows[0].earliest}`);
    console.log(`  最新日期: ${decisions.rows[0].latest}`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkTables();
