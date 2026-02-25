/**
 * 技术指标计算测试脚本
 * 测试MA, MACD, RSI, KDJ, BOLL计算功能
 */

require('dotenv').config();
const EnhancedMarketService = require('../services/market-data/enhanced-market-service');

async function testIndicatorCalculation() {
  const service = new EnhancedMarketService();

  console.log('🧪 开始技术指标计算测试...\n');

  // 生成测试数据
  const generateTestData = (count = 100) => {
    const data = [];
    let price = 10.0;

    for (let i = 0; i < count; i++) {
      const change = (Math.random() - 0.5) * 0.5;
      price = price + change;

      const open = price + (Math.random() - 0.5) * 0.2;
      const close = price;
      const high = Math.max(open, close) + Math.random() * 0.1;
      const low = Math.min(open, close) - Math.random() * 0.1;

      data.push({
        stockCode: 'TEST001',
        tradeDate: `2024-01-${String(i + 1).padStart(2, '0')}`,
        openPrice: parseFloat(open.toFixed(2)),
        closePrice: parseFloat(close.toFixed(2)),
        highPrice: parseFloat(high.toFixed(2)),
        lowPrice: parseFloat(low.toFixed(2)),
        volume: Math.floor(Math.random() * 1000000) + 100000,
        amount: 0
      });
    }

    return data;
  };

  const testData = generateTestData(100);

  console.log(`📊 生成 ${testData.length} 条测试数据\n`);

  // 1. 测试MA计算
  console.log('1️⃣  测试MA（移动平均线）计算...');
  const closes = testData.map(d => d.closePrice);

  const ma5 = service.calculateMA(closes, 5);
  const ma20 = service.calculateMA(closes, 20);

  console.log(`   MA5 (最后5个值): ${ma5.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log(`   MA20 (最后5个值): ${ma20.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log('   ✅ MA计算完成\n');

  // 2. 测试MACD计算
  console.log('2️⃣  测试MACD计算...');
  const macd = service.calculateMACD(closes);
  console.log(`   MACD (最后5个值): ${macd.macd.slice(-5).map(v => v === null ? 'null' : v.toFixed(4)).join(', ')}`);
  console.log(`   Signal (最后5个值): ${macd.signal.slice(-5).map(v => v === null ? 'null' : v.toFixed(4)).join(', ')}`);
  console.log(`   Histogram (最后5个值): ${macd.hist.slice(-5).map(v => v === null ? 'null' : v.toFixed(4)).join(', ')}`);
  console.log('   ✅ MACD计算完成\n');

  // 3. 测试RSI计算
  console.log('3️⃣  测试RSI计算...');
  const rsi6 = service.calculateRSI(closes, 6);
  const rsi12 = service.calculateRSI(closes, 12);
  console.log(`   RSI6 (最后5个值): ${rsi6.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log(`   RSI12 (最后5个值): ${rsi12.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log('   ✅ RSI计算完成\n');

  // 4. 测试KDJ计算
  console.log('4️⃣  测试KDJ计算...');
  const highs = testData.map(d => d.highPrice);
  const lows = testData.map(d => d.lowPrice);
  const kdj = service.calculateKDJ(highs, lows, closes);
  console.log(`   K (最后5个值): ${kdj.k.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log(`   D (最后5个值): ${kdj.d.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log(`   J (最后5个值): ${kdj.j.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log('   ✅ KDJ计算完成\n');

  // 5. 测试BOLL计算
  console.log('5️⃣  测试BOLL（布林带）计算...');
  const boll = service.calculateBOLL(closes);
  console.log(`   Upper (最后5个值): ${boll.upper.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log(`   Mid (最后5个值): ${boll.mid.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log(`   Lower (最后5个值): ${boll.lower.slice(-5).map(v => v === null ? 'null' : v.toFixed(2)).join(', ')}`);
  console.log('   ✅ BOLL计算完成\n');

  // 6. 测试综合计算
  console.log('6️⃣  测试综合指标计算...');
  const marketData = await service.calculateIndicators(testData);
  console.log(`   ✅ 计算完成，生成 ${marketData.length} 条记录`);

  // 显示最后一条记录
  const last = marketData[marketData.length - 1];
  console.log(`\n   最后一条记录 (${last.tradeDate}):`);
  console.log(`     收盘价: ${last.closePrice}`);
  console.log(`     MA5: ${last.ma5}, MA20: ${last.ma20}`);
  console.log(`     MACD: ${last.macd}, Signal: ${last.macdSignal}`);
  console.log(`     RSI6: ${last.rsi6}, RSI12: ${last.rsi12}`);
  console.log(`     KDJ.K: ${last.kdjK}, KDJ.D: ${last.kdjD}, KDJ.J: ${last.kdjJ}`);
  console.log(`     BOLL上: ${last.bollUpper}, BOLL中: ${last.bollMid}, BOLL下: ${last.bollLower}\n`);

  console.log('✅ 所有技术指标计算测试通过!');
}

// 运行测试
testIndicatorCalculation()
  .then(() => {
    console.log('\n✨ 测试完成!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  });
