/**
 * 真实数据环境检查和配置助手
 */

require('dotenv').config();
const { Pool } = require('pg');

async function checkEnvironment() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 真实数据环境检查');
  console.log('='.repeat(70) + '\n');

  // 1. 检查Tushare Token
  console.log('1️⃣  检查 TUSHARE_TOKEN');
  if (process.env.TUSHARE_TOKEN) {
    const token = process.env.TUSHARE_TOKEN;
    const masked = token.substring(0, 10) + '...' + token.substring(token.length - 6);
    console.log(`   ✅ TUSHARE_TOKEN 已配置: ${masked}`);
    console.log(`   长度: ${token.length} 位`);
  } else {
    console.log('   ❌ TUSHARE_TOKEN 未配置');
    console.log('\n   请执行以下步骤:');
    console.log('   1. 访问: https://tushare.pro/register');
    console.log('   2. 注册并获取免费Token');
    console.log('   3. 编辑 .env 文件添加: TUSHARE_TOKEN=你的token');
    console.log('   4. 重新运行此检查\n');
    return false;
  }

  // 2. 检查数据库连接
  console.log('\n2️⃣  检查数据库连接');
  try {
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    await pool.query('SELECT 1');
    await pool.end();
    console.log('   ✅ 数据库连接正常');
  } catch (error) {
    console.log(`   ❌ 数据库连接失败: ${error.message}`);
    return false;
  }

  // 3. 检查数据库中的数据
  console.log('\n3️⃣  检查数据库数据');
  try {
    const pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: process.env.POSTGRES_PORT || 5432,
      database: process.env.POSTGRES_DB || 'political_news',
      user: process.env.POSTGRES_USER || 'political_news_user',
      password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
    });

    const marketCount = await pool.query('SELECT COUNT(*) FROM market_data');
    const fundCount = await pool.query('SELECT COUNT(*) FROM fund_flow');
    const newsCount = await pool.query('SELECT COUNT(*) FROM news_events');

    console.log(`   市场数据: ${marketCount.rows[0].count} 条`);
    console.log(`   资金流向: ${fundCount.rows[0].count} 条`);
    console.log(`   新闻事件: ${newsCount.rows[0].count} 条`);

    if (marketCount.rows[0].count === 0) {
      console.log('\n   💡 数据库为空，需要获取真实数据');
      console.log('   执行: node scripts/fetch-real-data.js');
    }

    await pool.end();
  } catch (error) {
    console.log(`   ❌ 查询失败: ${error.message}`);
  }

  // 4. 检查Node.js依赖
  console.log('\n4️⃣  检查依赖包');
  try {
    require('tushare');
    console.log('   ✅ tushare 包已安装');
  } catch (error) {
    console.log('   ❌ tushare 包未安装');
    console.log('   执行: npm install tushare --save');
    return false;
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n✅ 环境检查完成!');
  console.log('\n下一步操作:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n1️⃣  获取真实数据:');
  console.log('   node scripts/fetch-real-data.js');
  console.log('\n2️⃣  启动测试服务器:');
  console.log('   node index.js');
  console.log('\n3️⃣  验收测试 (另开终端):');
  console.log('   curl -X POST http://localhost:3001/api/v2/decision/generate \\');
  console.log('     -H "Content-Type: application/json" \\');
  console.log('     -d \'{"stockCode": "000001.SZ"}\'');
  console.log('\n' + '='.repeat(70) + '\n');

  return true;
}

// 运行检查
checkEnvironment()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ 检查失败:', error.message);
    process.exit(1);
  });
