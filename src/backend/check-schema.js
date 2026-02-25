const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'political_news',
  user: 'political_news_user',
  password: 'political_news_pass'
});

pool.query(`
  SELECT column_name, data_type
  FROM information_schema.columns
  WHERE table_name = 'news_events'
  ORDER BY ordinal_position
`).then(res => {
  console.log('news_events columns:');
  res.rows.forEach(row => {
    console.log(`  ${row.column_name}: ${row.data_type}`);
  });
  pool.end();
}).catch(err => {
  console.error(err.message);
  pool.end();
});
