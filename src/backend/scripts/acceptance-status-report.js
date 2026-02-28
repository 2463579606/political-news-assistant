/**
 * 系统验收状态报告
 * System Acceptance Status Report
 */

require('dotenv').config();
const { Pool } = require('pg');

console.log('\n' + '='.repeat(80));
console.log('📋 系统验收准备状态报告');
console.log('System Acceptance Readiness Report');
console.log('='.repeat(80) + '\n');

// 1. 环境检查
console.log('1️⃣  环境配置检查');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

const checks = {
  NODE_ENV: process.env.NODE_ENV || '未设置',
  PORT: process.env.PORT || '未设置',
  POSTGRES_HOST: process.env.POSTGRES_HOST || '未设置',
  POSTGRES_DB: process.env.POSTGRES_DB || '未设置',
  POSTGRES_USER: process.env.POSTGRES_USER || '未设置',
  TUSHARE_TOKEN: process.env.TUSHARE_TOKEN ? '✅ 已配置' : '❌ 未配置 (必需)'
};

Object.entries(checks).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// 2. 数据库检查
async function checkDatabase() {
  console.log('\n2️⃣  数据库状态检查');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const pool = new Pool({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: process.env.POSTGRES_PORT || 5432,
    database: process.env.POSTGRES_DB || 'political_news',
    user: process.env.POSTGRES_USER || 'political_news_user',
    password: process.env.POSTGRES_PASSWORD || 'political_news_pass',
  });

  try {
    await pool.query('SELECT 1');
    console.log('  ✅ 数据库连接: 正常');

    const tables = [
      { name: 'market_data', desc: '市场数据' },
      { name: 'fund_flow', desc: '资金流向' },
      { name: 'news_events', desc: '新闻事件' }
    ];

    for (const table of tables) {
      const result = await pool.query(`SELECT COUNT(*) FROM ${table.name}`);
      const count = result.rows[0].count;
      const status = count === '0' ? '✅ 空载 (可接受真实数据)' : '⚠️  含有数据';
      console.log(`  ${status} ${table.desc} (${table.name}): ${count} 条`);
    }
  } catch (error) {
    console.log(`  ❌ 数据库连接失败: ${error.message}`);
  } finally {
    await pool.end();
  }
}

// 3. 功能模块检查
async function checkModules() {
  console.log('\n3️⃣  功能模块状态');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const modules = [
    { name: 'EnhancedMarketService', path: 'services/market-data/enhanced-market-service', desc: '市场数据服务 (Tushare集成)' },
    { name: 'TechnicalScoreService', path: 'services/scoring/technical-score-service', desc: '技术评分服务' },
    { name: 'DecisionEngine', path: 'services/decision/decision-engine', desc: '决策引擎' },
    { name: 'BacktestEngine', path: 'services/backtest/backtest-engine', desc: '回测引擎' },
    { name: 'MonitoringService', path: 'services/monitoring/monitoring-service', desc: '监控服务' }
  ];

  modules.forEach(mod => {
    try {
      require(`../${mod.path}`);
      console.log(`  ✅ ${mod.desc}`);
    } catch (error) {
      console.log(`  ❌ ${mod.desc}: ${error.message}`);
    }
  });
}

// 4. 验收流程
function showProcess() {
  console.log('\n4️⃣  验收流程 (Acceptance Process)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!process.env.TUSHARE_TOKEN) {
    console.log('\n  ⛔ 阻塞问题: TUSHARE_TOKEN 未配置\n');
    console.log('  解决步骤:');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  1. 访问 Tushare 官网注册 (免费):');
    console.log('     https://tushare.pro/register');
    console.log('\n  2. 登录后进入用户中心，获取 API Token');
    console.log('     Token 格式: 28xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx23');
    console.log('\n  3. 编辑 .env 文件，添加以下行:');
    console.log('     TUSHARE_TOKEN=你的token复制到这里');
    console.log('\n  4. 保存文件后，运行环境检查:');
    console.log('     node scripts/check-real-data-env.js');
    console.log('\n  5. 获取真实数据:');
    console.log('     node scripts/fetch-real-data.js');
    console.log('\n  6. 启动测试服务器:');
    console.log('     node index.js');
    console.log('\n  7. 验收测试 (在新终端):');
    console.log('     curl -X POST http://localhost:3001/api/v2/decision/generate \\');
    console.log('       -H "Content-Type: application/json" \\');
    console.log('       -d \'{"stockCode": "000001.SZ"}\'');
  } else {
    console.log('\n  ✅ TUSHARE_TOKEN 已配置，可以开始验收\n');
    console.log('  下一步操作:');
    console.log('  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  1. 获取真实数据:');
    console.log('     node scripts/fetch-real-data.js');
    console.log('\n  2. 启动测试服务器:');
    console.log('     node index.js');
    console.log('\n  3. 验收测试:');
    console.log('     curl -X POST http://localhost:3001/api/v2/decision/generate \\');
    console.log('       -H "Content-Type: application/json" \\');
    console.log('       -d \'{"stockCode": "000001.SZ"}\'');
  }
}

// 5. 热门股票列表
function showHotStocks() {
  console.log('\n\n5️⃣  可测试的热门股票 (Hot Stocks for Testing)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stocks = [
    { code: '000001.SZ', name: '平安银行', market: '深交所' },
    { code: '000002.SZ', name: '万科A', market: '深交所' },
    { code: '000858.SZ', name: '五粮液', market: '深交所' },
    { code: '002475.SZ', name: '立讯精密', market: '深交所' },
    { code: '600000.SH', name: '浦发银行', market: '上交所' },
    { code: '600036.SH', name: '招商银行', market: '上交所' },
    { code: '600519.SH', name: '贵州茅台', market: '上交所' },
    { code: '601318.SH', name: '中国平安', market: '上交所' },
    { code: '600900.SH', name: '长江电力', market: '上交所' },
    { code: '000063.SZ', name: '中兴通讯', market: '深交所' }
  ];

  stocks.forEach(stock => {
    console.log(`  ${stock.code.padEnd(12)} ${stock.name.padEnd(10)} [${stock.market}]`);
  });
}

// 主函数
async function main() {
  await checkDatabase();
  await checkModules();
  showProcess();
  showHotStocks();

  console.log('\n' + '='.repeat(80));
  console.log('\n💡 提示: Tushare 免费版提供每分钟 120 次请求');
  console.log('   详细配置指南: cat /tmp/tushare-setup-guide.md');
  console.log('\n' + '='.repeat(80) + '\n');

  if (!process.env.TUSHARE_TOKEN) {
    console.log('⚠️  当前状态: 等待 TUSHARE_TOKEN 配置\n');
    process.exit(1);
  } else {
    console.log('✅ 系统就绪，可以开始验收!\n');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ 检查失败:', error.message);
  process.exit(1);
});
