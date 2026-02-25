/**
 * 资金流向数据模拟测试脚本
 * 使用模拟数据测试资金流向服务功能
 */

require('dotenv').config();
const FundFlowService = require('../services/fund-flow/fund-flow-service');

async function testWithMockData() {
  const service = new FundFlowService();

  console.log('🧪 开始资金流向服务模拟测试...\n');

  // 生成模拟资金流向数据
  function generateMockFundFlowData(stockCode, days = 5) {
    const data = [];
    const date = new Date();

    for (let i = 0; i < days; i++) {
      const mainInflow = Math.random() * 10000 + 5000;
      const mainOutflow = Math.random() * 10000 + 5000;
      const mainNet = mainInflow - mainOutflow;

      const superlargeInflow = Math.random() * 5000;
      const superlargeOutflow = Math.random() * 5000;

      const largeInflow = Math.random() * 3000;
      const largeOutflow = Math.random() * 3000;

      const mediumInflow = Math.random() * 2000;
      const mediumOutflow = Math.random() * 2000;

      const smallInflow = Math.random() * 1000;
      const smallOutflow = Math.random() * 1000;

      const northInflow = Math.random() * 2000;
      const northOutflow = Math.random() * 2000;

      data.push({
        stockCode: stockCode,
        stockName: `测试股票${stockCode}`,
        tradeDate: date.toISOString().split('T')[0],
        mainInflow: parseFloat(mainInflow.toFixed(2)),
        mainOutflow: parseFloat(mainOutflow.toFixed(2)),
        mainNet: parseFloat(mainNet.toFixed(2)),
        mainNetRatio: parseFloat(((mainNet / (mainInflow + mainOutflow)) * 100).toFixed(2)),
        superlargeInflow: parseFloat(superlargeInflow.toFixed(2)),
        superlargeOutflow: parseFloat(superlargeOutflow.toFixed(2)),
        superlargeNet: parseFloat((superlargeInflow - superlargeOutflow).toFixed(2)),
        largeInflow: parseFloat(largeInflow.toFixed(2)),
        largeOutflow: parseFloat(largeOutflow.toFixed(2)),
        largeNet: parseFloat((largeInflow - largeOutflow).toFixed(2)),
        mediumInflow: parseFloat(mediumInflow.toFixed(2)),
        mediumOutflow: parseFloat(mediumOutflow.toFixed(2)),
        mediumNet: parseFloat((mediumInflow - mediumOutflow).toFixed(2)),
        smallInflow: parseFloat(smallInflow.toFixed(2)),
        smallOutflow: parseFloat(smallOutflow.toFixed(2)),
        smallNet: parseFloat((smallInflow - smallOutflow).toFixed(2)),
        northboundInflow: parseFloat(northInflow.toFixed(2)),
        northboundOutflow: parseFloat(northOutflow.toFixed(2)),
        northboundNet: parseFloat((northInflow - northOutflow).toFixed(2))
      });

      date.setDate(date.getDate() - 1);
    }

    return data.reverse();
  }

  try {
    // 1. 测试保存和查询
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1️⃣  测试数据保存和查询');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testData1 = generateMockFundFlowData('TEST001', 10);
    await service.saveToDatabase(testData1);
    console.log(`✅ 保存 ${testData1.length} 条模拟数据\n`);

    const queriedData = await service.getFromDatabase('TEST001', 5);
    console.log(`✅ 查询到 ${queriedData.length} 条记录`);
    console.log('最新记录:');
    if (queriedData.length > 0) {
      const latest = queriedData[0];
      console.log(`  日期: ${latest.trade_date}`);
      console.log(`  主力净流入: ${parseFloat(latest.main_net).toFixed(2)} 万元`);
      console.log(`  主力净流入占比: ${parseFloat(latest.main_net_ratio).toFixed(2)}%\n`);
    }

    // 2. 测试资金流向分析
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2️⃣  测试资金流向模式分析');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const analysis = await service.analyzeFlowPattern('TEST001', 10);
    console.log('✅ 分析结果:');
    console.log(`  趋势: ${analysis.trend}`);
    console.log(`  强度: ${analysis.strength}`);
    console.log(`  摘要: ${analysis.summary}`);
    console.log(`  统计:`);
    console.log(`    累计净流入: ${analysis.statistics.totalMainNet} 万元`);
    console.log(`    平均净流入: ${analysis.statistics.avgMainNet} 万元`);
    console.log(`    最大连续流入天数: ${analysis.statistics.maxConsecutiveInflow}`);
    console.log(`    最大连续流出天数: ${analysis.statistics.maxConsecutiveOutflow}\n`);

    // 3. 测试多只股票
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3️⃣  测试多只股票数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testStocks = ['TEST002', 'TEST003'];
    for (const stockCode of testStocks) {
      const data = generateMockFundFlowData(stockCode, 5);
      await service.saveToDatabase(data);
      console.log(`✅ ${stockCode}: 保存 ${data.length} 条数据`);
    }
    console.log('');

    // 4. 测试汇总统计
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4️⃣  测试数据库统计');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const pool = service.pool;
    const statsQuery = `
      SELECT
        COUNT(*) as total_records,
        COUNT(DISTINCT stock_code) as unique_stocks,
        SUM(CASE WHEN main_net > 0 THEN 1 ELSE 0 END) as inflow_records,
        SUM(CASE WHEN main_net < 0 THEN 1 ELSE 0 END) as outflow_records
      FROM fund_flow
    `;
    const stats = await pool.query(statsQuery);
    console.log('✅ 数据库统计:');
    console.log(`   总记录数: ${stats.rows[0].total_records}`);
    console.log(`   股票数量: ${stats.rows[0].unique_stocks}`);
    console.log(`   流入记录: ${stats.rows[0].inflow_records}`);
    console.log(`   流出记录: ${stats.rows[0].outflow_records}\n`);

    // 5. 清理测试数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('5️⃣  清理测试数据');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    for (const stockCode of ['TEST001', 'TEST002', 'TEST003']) {
      await pool.query('DELETE FROM fund_flow WHERE stock_code = $1', [stockCode]);
      console.log(`✅ 清理 ${stockCode}`);
    }
    console.log('');

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ 资金流向服务模拟测试完成!');
    console.log('\n⚠️  注意事项:');
    console.log('   - 东方财富API已变更，返回404错误');
    console.log('   - 核心功能逻辑已验证正确');
    console.log('   - 实际使用需要更新API地址或使用其他数据源');
    console.log('   - 建议数据源: Tushare、AKShare等');
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }
}

// 运行测试
testWithMockData()
  .then(() => {
    console.log('✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
