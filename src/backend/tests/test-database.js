/**
 * 数据库测试脚本
 * 测试market_data表的插入和查询功能
 */

require('dotenv').config();
const { Pool } = require('pg');

// 创建测试数据
function generateMockMarketData(stockCode, startDate, days = 100) {
  const data = [];
  let price = 10.0;
  const date = new Date(startDate);

  for (let i = 0; i < days; i++) {
    // 生成随机价格波动
    const change = (Math.random() - 0.5) * 0.5;
    price = price + change;

    const open = price + (Math.random() - 0.5) * 0.2;
    const close = price;
    const high = Math.max(open, close) + Math.random() * 0.1;
    const low = Math.min(open, close) - Math.random() * 0.1;
    const volume = Math.floor(Math.random() * 1000000) + 100000;

    data.push({
      stockCode: stockCode,
      stockName: '测试股票',
      tradeDate: date.toISOString().split('T')[0],
      openPrice: parseFloat(open.toFixed(2)),
      closePrice: parseFloat(close.toFixed(2)),
      highPrice: parseFloat(high.toFixed(2)),
      lowPrice: parseFloat(low.toFixed(2)),
      volume: volume,
      amount: parseFloat((volume * close).toFixed(2))
    });

    date.setDate(date.getDate() + 1);
    price = close;
  }

  return data;
}

async function testDatabase() {
  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  const client = await pool.connect();

  try {
    console.log('🔄 开始数据库测试...\n');

    // 1. 测试插入数据
    console.log('📝 插入测试数据...');
    const testData = generateMockMarketData('TEST001', '2024-01-01', 200);

    const insertQuery = `
      INSERT INTO market_data (
        stock_code, stock_name, trade_date, open_price, close_price,
        high_price, low_price, volume, amount
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (stock_code, trade_date) DO NOTHING
    `;

    for (const data of testData) {
      await client.query(insertQuery, [
        data.stockCode,
        data.stockName,
        data.tradeDate,
        data.openPrice,
        data.closePrice,
        data.highPrice,
        data.lowPrice,
        data.volume,
        data.amount
      ]);
    }

    console.log(`✅ 插入 ${testData.length} 条测试数据`);

    // 2. 测试查询数据
    console.log('\n📖 查询测试数据...');
    const selectQuery = `
      SELECT * FROM market_data
      WHERE stock_code = $1
      ORDER BY trade_date DESC
      LIMIT $2
    `;

    const result = await client.query(selectQuery, ['TEST001', 5]);
    console.log(`✅ 查询到 ${result.rows.length} 条记录:`);

    result.rows.forEach(row => {
      console.log(`   ${row.trade_date}: 收盘 ${row.close_price}, 成交量 ${row.volume}`);
    });

    // 3. 测试统计查询
    console.log('\n📊 统计查询...');
    const statsQuery = `
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT stock_code) as unique_stocks,
        MIN(trade_date) as earliest_date,
        MAX(trade_date) as latest_date
      FROM market_data
    `;

    const stats = await client.query(statsQuery);
    console.log('✅ 数据库统计:');
    console.log(`   总记录数: ${stats.rows[0].total_records}`);
    console.log(`   股票数量: ${stats.rows[0].unique_stocks}`);
    console.log(`   日期范围: ${stats.rows[0].earliest_date} ~ ${stats.rows[0].latest_date}`);

    // 4. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await client.query('DELETE FROM market_data WHERE stock_code = $1', ['TEST001']);
    console.log('✅ 测试数据已清理');

    console.log('\n✅ 数据库测试完成!');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行测试
testDatabase()
  .then(() => {
    console.log('\n✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
