/**
 * 资金流向数据测试脚本
 * 测试资金流向采集和分析功能
 */

require('dotenv').config();
const FundFlowService = require('../services/fund-flow/fund-flow-service');

async function testFundFlowService() {
  const service = new FundFlowService();

  console.log('🧪 开始测试资金流向服务...\n');

  // 测试股票代码
  const testStock = '000001'; // 平安银行

  try {
    // 1. 测试更新资金流向数据
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`1️⃣  测试更新资金流向数据: ${testStock}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const data = await service.updateStockFundFlow(testStock, 5);

    if (data && data.length > 0) {
      console.log(`✅ 成功获取 ${data.length} 条数据\n`);
      console.log('最新数据:');
      console.log(`  日期: ${data[data.length - 1].tradeDate}`);
      console.log(`  主力净流入: ${data[data.length - 1].mainNet.toFixed(2)} 万元`);
      console.log(`  主力净流入占比: ${data[data.length - 1].mainNetRatio.toFixed(2)}%`);
      console.log(`  超大单净流入: ${data[data.length - 1].superlargeNet.toFixed(2)} 万元`);
      console.log(`  大单净流入: ${data[data.length - 1].largeNet.toFixed(2)} 万元`);
      console.log(`  中单净流入: ${data[data.length - 1].mediumNet.toFixed(2)} 万元`);
      console.log(`  小单净流入: ${data[data.length - 1].smallNet.toFixed(2)} 万元`);
      console.log(`  北向资金净流入: ${data[data.length - 1].northboundNet.toFixed(2)} 万元\n`);
    }

    // 2. 测试从数据库查询
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`2️⃣  测试从数据库查询: ${testStock}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const dbData = await service.getFromDatabase(testStock, 5);
    console.log(`✅ 查询到 ${dbData.length} 条记录\n`);

    // 3. 测试资金流向分析
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`3️⃣  测试资金流向模式分析: ${testStock}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const analysis = await service.analyzeFlowPattern(testStock, 5);
    console.log('✅ 分析结果:');
    console.log(`  趋势: ${analysis.trend}`);
    console.log(`  强度: ${analysis.strength}`);
    console.log(`  摘要: ${analysis.summary}`);
    console.log(`  统计:`);
    console.log(`    累计净流入: ${analysis.statistics.totalMainNet} 万元`);
    console.log(`    平均净流入: ${analysis.statistics.avgMainNet} 万元`);
    console.log(`    最大连续流入天数: ${analysis.statistics.maxConsecutiveInflow}`);
    console.log(`    最大连续流出天数: ${analysis.statistics.maxConsecutiveOutflow}\n`);

    // 4. 测试批量更新
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`4️⃣  测试批量更新资金流向数据`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testStocks = ['000001', '600000'];
    const results = await service.batchUpdateFundFlow(testStocks, 3);

    console.log(`✅ 批量更新完成:`);
    results.forEach(r => {
      console.log(`  ${r.stockCode}: ${r.success ? '✅ 成功' : '❌ 失败'} (${r.count} 条)`);
      if (!r.success) {
        console.log(`    错误: ${r.error}`);
      }
    });
    console.log('');

  } catch (error) {
    console.error('❌ 测试失败:', error.message);
    throw error;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n✅ 资金流向服务测试完成!');
  console.log('\n💡 提示:');
  console.log('   - 北向资金数据使用模拟数据');
  console.log('   - 实际应用中需要接入真实的北向资金API');
  console.log('   - 东方财富API可能有访问限制');
  console.log('');
}

// 运行测试
testFundFlowService()
  .then(() => {
    console.log('✨ 所有测试通过!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
